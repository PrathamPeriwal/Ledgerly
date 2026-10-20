const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/50 dark:to-purple-900/50 flex items-center justify-center p-4">
      {/* Floating background elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/30 dark:bg-blue-500/20 rounded-full blur-xl animate-float"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-200/30 dark:bg-purple-500/20 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-cyan-200/30 dark:bg-cyan-500/20 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
