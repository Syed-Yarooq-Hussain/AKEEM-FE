import React from 'react'
import Input from '../components/Input'
import SocialButton from '../components/SocialButton'
import GoogleIcon from '../assets/google.svg'
import LinkedInIcon from '../assets/linkedin.svg'
import Button from '../components/Button'

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-2">Welcome back</h2>
        <p className="text-sm text-slate-600 mb-6">Sign in to your organization account</p>

        <div className="space-y-3 mb-4">
          <SocialButton icon={<img src={GoogleIcon} alt="Google" />}>Continue with Google</SocialButton>
          <SocialButton icon={<img src={LinkedInIcon} alt="LinkedIn" />}>Continue with LinkedIn</SocialButton>
        </div>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t" />
          <span className="text-xs text-slate-500">or sign in with email</span>
          <div className="flex-1 border-t" />
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Input label="Work Email" type="email" placeholder="you@company.com" required />
          <Input label="Password" type="password" placeholder="Enter your password" required />

          <div className="flex items-center justify-between text-sm text-slate-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              <span>Remember me</span>
            </label>
            <a href="#" className="text-indigo-600 hover:underline">Forgot password?</a>
          </div>

          <div>
            <Button type="submit" className="w-full">Sign In</Button>
          </div>
        </form>

        <p className="text-sm text-slate-600 mt-4">Don't have an account? <a href="#" className="text-indigo-600 hover:underline">Create account</a></p>
      </div>
    </div>
  )
}
