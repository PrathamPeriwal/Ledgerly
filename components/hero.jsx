"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";

const HeroSection = () => {

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/50 dark:to-purple-900/50 pt-28 md:pt-32 pb-10 md:pb-16 overflow-hidden">
      {/* Dynamic background grid */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(59, 130, 246, 0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
          animation: 'float 20s ease-in-out infinite'
        }}></div>
      </div>

      {/* Animated floating elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-2xl animate-float"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-r from-purple-400/20 to-cyan-400/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }}></div>

      {/* Geometric shapes */}
      <div className="absolute top-32 right-1/4 w-16 h-16 border-2 border-blue-300/30 dark:border-blue-500/30 rotate-45 animate-float" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute bottom-32 left-1/3 w-12 h-12 border-2 border-purple-300/30 dark:border-purple-500/30 rounded-full animate-bounce-gentle"></div>

      <div className="container mx-auto text-center px-4 max-w-7xl relative z-10">
        {/* Enhanced title section */}
        <div className="mb-16">
          <div className="animate-fade-in">
            <div className="relative inline-block">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black mb-4 md:mb-6 text-gray-900 dark:text-white leading-none tracking-tight">
                <span className="relative">
                  <span className="gradient-text animate-gradient-shift bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600">
                    LEDGERLY
                  </span>
                  {/* Glowing effect behind text */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20 blur-3xl scale-110 animate-pulse"></div>
                </span>
              </h1>

              {/* Floating particles around title */}
              <div className="absolute -top-4 -left-4 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
              <div className="absolute -top-2 -right-6 w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute -bottom-4 left-1/4 w-2 h-2 bg-cyan-500 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              <div className="absolute -bottom-2 right-1/3 w-3 h-3 bg-green-500 rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
            </div>

            <div className="flex items-center justify-center gap-2 md:gap-4 mb-6 md:mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent w-12 md:w-24 animate-shimmer"></div>
              <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-600 dark:text-gray-300 font-light px-4 md:px-6 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                Smart Financial Intelligence
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent w-12 md:w-24 animate-shimmer" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="hero-text text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 md:mb-12 max-w-4xl mx-auto leading-relaxed px-4 sm:px-0">
              Experience the future of financial management with
              <span className="relative inline-block mx-1">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">AI-powered insights</span>
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500/30 animate-shimmer"></div>
              </span>,
              <span className="relative inline-block mx-1">
                <span className="text-purple-600 dark:text-purple-400 font-semibold">real-time analytics</span>
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500/30 animate-shimmer" style={{ animationDelay: '0.5s' }}></div>
              </span>,
              and <span className="relative inline-block mx-1">
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">intelligent automation</span>
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500/30 animate-shimmer" style={{ animationDelay: '1s' }}></div>
              </span> that revolutionizes your financial journey.
            </div>
          </div>

          {/* Enhanced CTA buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6 mb-12 md:mb-20 animate-scale-in px-4 sm:px-0" style={{ animationDelay: '0.3s' }}>
            <Link href="/dashboard">
              <Button size="lg" className="relative group btn-modern px-6 sm:px-8 md:px-10 py-4 md:py-5 text-base md:text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl overflow-hidden w-full sm:w-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-shimmer"></div>
                <span className="relative z-10 flex items-center justify-center gap-2 md:gap-3">
                  <span className="text-lg">🚀</span>
                  <span className="hidden sm:inline">Launch Your Journey</span>
                  <span className="sm:hidden">Get Started</span>
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="btn-modern px-6 sm:px-8 md:px-10 py-4 md:py-5 text-base md:text-lg border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl w-full sm:w-auto">
                <span className="flex items-center justify-center gap-2 md:gap-3">
                  <span className="text-lg">✨</span>
                  <span className="hidden sm:inline">Explore Features</span>
                  <span className="sm:hidden">Features</span>
                </span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Interactive Financial Insights Visualization */}
        <div className="relative max-w-6xl mx-auto animate-slide-up px-4 sm:px-6" style={{ animationDelay: '0.8s' }}>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">

            {/* AI Insights Header */}
            <div className="text-center mb-8 md:mb-12 animate-fade-in">
              <div className="inline-flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full mb-4 md:mb-6">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">AI Financial Insights Active</span>
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
                Your Financial Intelligence Center
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 px-4 sm:px-0">Real-time AI analysis of your financial patterns and opportunities</p>
            </div>

            {/* Interactive Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-8 md:mb-12">

              {/* Smart Savings Predictor */}
              <div className="relative group">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/50 card-hover h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center animate-pulse-glow">
                      <span className="text-white text-xl">🎯</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">AI PREDICTION</div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Smart Savings Goal</h4>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">$2,340</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Achievable by Dec 2025</p>

                  {/* Progress bar */}
                  <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full animate-shimmer" style={{ width: '68%' }}></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">68% probability</div>
                </div>
              </div>

              {/* Expense Optimizer */}
              <div className="relative group">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-700/50 card-hover h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center animate-pulse-glow">
                      <span className="text-white text-xl">⚡</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">OPTIMIZATION</div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Monthly Savings</h4>
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">$485</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Potential optimization</p>

                  {/* Progress bar to match other cards */}
                  <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full animate-shimmer" style={{ width: '70%' }}></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">70% efficiency gain</div>
                </div>
              </div>

              {/* Investment Insights */}
              <div className="relative group">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200/50 dark:border-green-700/50 card-hover h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center animate-pulse-glow">
                      <span className="text-white text-xl">📈</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">OPPORTUNITY</div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Growth Potential</h4>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">+12.5%</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Projected annual return</p>

                  {/* Mini chart */}
                  <div className="mt-4 flex items-end justify-between h-8 gap-1">
                    {[40, 65, 45, 80, 60, 90, 75].map((height, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-green-500 to-emerald-400 rounded-t flex-1 animate-bounce-gentle"
                        style={{
                          height: `${height}%`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Recommendations Ticker */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800/50 dark:to-blue-900/20 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center animate-pulse-glow">
                  <span className="text-white text-sm">🤖</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">AI Recommendations</h4>
                <div className="flex-1 h-px bg-gradient-to-r from-blue-500/30 to-transparent"></div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-700/30 rounded-lg animate-slide-left">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Consider increasing your emergency fund by $200/month</span>
                  <div className="ml-auto text-xs text-green-600 dark:text-green-400 font-medium">High Impact</div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-700/30 rounded-lg animate-slide-left" style={{ animationDelay: '0.2s' }}>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Optimize subscription spending - potential $45/month savings</span>
                  <div className="ml-auto text-xs text-blue-600 dark:text-blue-400 font-medium">Medium Impact</div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-700/30 rounded-lg animate-slide-left" style={{ animationDelay: '0.4s' }}>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Investment opportunity detected in tech sector ETFs</span>
                  <div className="ml-auto text-xs text-purple-600 dark:text-purple-400 font-medium">Opportunity</div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg animate-bounce-gentle">
              <span className="text-white text-xs">✨</span>
            </div>
            <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-float">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Enhanced glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 blur-3xl -z-10 scale-110 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
