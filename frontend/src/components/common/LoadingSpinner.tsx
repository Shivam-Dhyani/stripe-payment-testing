const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-200 border-t-brand-500"></div>
    </div>
  );
};

export default LoadingSpinner;
