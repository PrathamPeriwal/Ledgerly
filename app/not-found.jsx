"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 pt-24 md:pt-28 pb-8 px-4 relative overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute top-32 left-4 md:left-10 w-24 md:w-32 h-24 md:h-32 bg-blue-200/30 dark:bg-blue-500/20 rounded-full blur-xl animate-float"></div>
      <div className="absolute bottom-20 right-4 md:right-10 w-32 md:w-40 h-32 md:h-40 bg-purple-200/30 dark:bg-purple-500/20 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }}></div>

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center relative z-10">
        <div className="max-w-2xl mx-auto w-full">
          {/* 404 Number */}
          <div className="animate-scale-in mb-6 md:mb-8">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-gray-900 dark:text-white mb-4 relative leading-none">
              <span className="gradient-text bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600">
                404
              </span>
              {/* Floating particles */}
              <div className="absolute -top-2 md:-top-4 -right-2 md:-right-4 w-2 md:w-3 h-2 md:h-3 bg-blue-500 rounded-full animate-ping"></div>
              <div className="absolute -bottom-2 md:-bottom-4 -left-2 md:-left-4 w-1.5 md:w-2 h-1.5 md:h-2 bg-purple-500 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
            </h1>
          </div>

          {/* Content */}
          <div className="animate-fade-in mb-8 md:mb-12" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">
              Oops! Page Not Found
            </h2>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mb-6 md:mb-8 leading-relaxed px-4 sm:px-0">
              The page you&apos;re looking for seems to have wandered off into the digital void.
              Don&apos;t worry, even the best financial plans sometimes take unexpected detours!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center animate-slide-up mb-8 md:mb-12" style={{ animationDelay: '0.4s' }}>
            <Link href="/">
              <Button size="lg" className="btn-modern px-6 md:px-8 py-3 md:py-4 text-base md:text-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 hover:scale-105 shadow-lg w-full sm:w-auto">
                <Home className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Return Home
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.history.back()}
              className="btn-modern px-6 md:px-8 py-3 md:py-4 text-base md:text-lg border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 hover:scale-105 w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Go Back
            </Button>
          </div>

          {/* Fun Financial Tip */}
          <div className="p-4 md:p-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl md:rounded-2xl border border-gray-200/50 dark:border-gray-700/50 animate-slide-up mx-4 sm:mx-0" style={{ animationDelay: '0.6s' }}>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              💡 <strong>Financial Tip:</strong> Just like this missing page, sometimes investments can disappear too.
              Always diversify your portfolio to avoid putting all your eggs in one basket!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
