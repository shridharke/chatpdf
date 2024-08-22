import { Pinecone } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { text } from "stream/consumers";
import { getEmbeddings } from "./embeddings";
import md5 from "md5";
import { metadata } from "@/app/layout";
import { Vector } from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch/data";
import { convertToAscii } from "./utils";

const pc = new Pinecone({
  apiKey: process.env.PINECONE_KEY as string,
});

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(file_key: string) {
  console.log("Downloading file from s3...");
  const file_name = await downloadFromS3(file_key);

  if (!file_name) {
    throw new Error("Could not download from S3");
  }

  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) as PDFPage[];

  const documents = await Promise.all(pages.map(prepareDocument));

  const vectors = await Promise.all(documents.flat().map(embedDocument));

  const pineconeIndex = pc.index("chatpdf");
  const namespace = convertToAscii(file_key);

  const recordChunks = chunks(vectors);

  // Upsert data with 200 records per upsert request
  for (const chunk of recordChunks) {
    await pineconeIndex.upsert(chunk);
  }

  return documents[0];
}

const chunks = (array: any[], batchSize = 10) => {
  const chunks = [];

  for (let i = 0; i < array.length; i += batchSize) {
    chunks.push(array.slice(i, i + batchSize));
  }

  return chunks;
};

async function embedDocument(doc: Document) {
  try {
    const embeddings = await getEmbeddings(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      },
    };
  } catch (error) {
    console.log("Error Embedding Document", error);
    throw error;
  }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");
  const splitter = new RecursiveCharacterTextSplitter();

  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
  return docs;
}
