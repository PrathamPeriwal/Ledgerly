import React from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, Zap, Globe, ArrowRight } from "lucide-react";
import {
  featuresData,
  howItWorksData,
  statsData,
} from "@/data/landing";
import HeroSection from "@/components/hero";
import Link from "next/link";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <HeroSection />

      {/* Why Choose Section - Refined */}
      <section className="py-16 md:py-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              Why Choose <span className="text-blue-600 dark:text-blue-400">Ledgerly</span>?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Experience the perfect blend of simplicity and power in financial management
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="group p-6 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 animate-slide-up card-hover">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 icon-hover animate-pulse-glow">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                AI-Powered Insights
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                Advanced algorithms analyze your spending patterns and provide personalized recommendations
              </p>
            </div>

            <div className="group p-6 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 animate-slide-up card-hover" style={{ animationDelay: '0.1s' }}>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 icon-hover animate-pulse-glow">
                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                Lightning Fast
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                Real-time transaction processing and instant insights. No more waiting for data to sync
              </p>
            </div>

            <div className="group p-6 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300 animate-slide-up card-hover" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 icon-hover animate-pulse-glow">
                <Globe className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300">
                Global Ready
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                Multi-currency support with real-time conversion rates for international users
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Clean & Refined */}
      <section className="py-16 md:py-24 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              Trusted by <span className="text-blue-600 dark:text-blue-400">Thousands</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Join the financial revolution with technology that&apos;s transforming lives worldwide
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {statsData.map((stat, index) => (
              <div
                key={index}
                className="text-center p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 animate-scale-in card-hover group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2 animate-bounce-gentle group-hover:scale-110 transition-transform duration-300">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-300 font-medium group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors duration-300">
                  {stat.label}
                </div>
                {/* Floating indicator */}
                <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-300"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Clean & Modern */}
      <section id="features" className="py-16 md:py-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              Powerful <span className="text-blue-600 dark:text-blue-400">Features</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Everything you need to manage your finances with confidence and ease
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {featuresData.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-gray-50 dark:bg-gray-800 rounded-xl hover:shadow-lg transition-all duration-300 animate-slide-up card-hover relative overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 icon-hover animate-pulse-glow">
                  <div className="text-blue-600 dark:text-blue-400 text-xl">
                    {feature.icon}
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                  {feature.description}
                </p>

                {/* Floating decoration */}
                <div className="absolute top-4 right-4 w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full opacity-0 group-hover:opacity-100 animate-float transition-opacity duration-300"></div>

                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section - Simplified */}
      <section id="how-it-works" className="py-16 md:py-24 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              How It <span className="text-blue-600 dark:text-blue-400">Works</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Get started in minutes with our simple, streamlined process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {howItWorksData.map((step, index) => (
              <div
                key={index}
                className="text-center animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-110 transition-transform duration-300">
                  <div className="text-blue-600 dark:text-blue-400 text-2xl">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Enhanced with Animations */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-800 relative overflow-hidden">
        {/* Floating background elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200/30 dark:bg-blue-500/20 rounded-full blur-xl animate-float"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-purple-200/30 dark:bg-purple-500/20 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }}></div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-3xl mx-auto animate-fade-in">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 animate-slide-up">
              Ready to Transform Your
              <span className="gradient-text"> Finances</span>?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Join thousands who are already managing their money smarter with Ledgerly
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-scale-in" style={{ animationDelay: '0.4s' }}>
              <Link href="/dashboard">
                <Button size="lg" className="btn-modern bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-blue-500/25 animate-pulse-glow">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 icon-hover" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="btn-modern border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-8 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105">
                Learn More
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 opacity-70 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="text-center group">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">256-bit</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Encryption</div>
              </div>
              <div className="text-center group">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300">99.9%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Uptime</div>
              </div>
              <div className="text-center group">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300">24/7</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Support</div>
              </div>
              <div className="text-center group">
                <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300">Free</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Forever</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
