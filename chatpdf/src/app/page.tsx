import { Button } from '@/components/ui/button'
import { UserButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { LogIn } from 'lucide-react'

const Home = async () => {

  const { userId } = await auth();
  const isAuth = !!userId;

  return (
    <div className="w-screen min-h-screen bg-gradient-to-r from-cyan-100 to-blue-200">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center">
            <h1 className="mr-3 text-5xl font-semibold">Chat with any PDF</h1>
            <UserButton afterSignOutUrl='/'></UserButton>
          </div>

          <div className="flex mt-2">
            {isAuth && <Button>Go to Chats</Button>}
          </div>

          <p className="max-w-xl mt-2 text-lg text-slate-600">Join millions on students, professionals and researchers to use AI to simplify your PDF research.</p>

          <div className="w-full mt-4">
            {isAuth ? (
              <h1>File Upload</h1>
            ) : (
              <Link href='/sign-in'>
                <Button>
                  Login to get Started
                  <LogIn className='w-4 h-4 ml-2'></LogIn>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home