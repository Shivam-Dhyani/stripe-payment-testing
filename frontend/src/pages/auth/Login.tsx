import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronLeft, Package } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { loginUser, clearError } from '../../store/slices/authSlice';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useAppSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/');
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const onSubmit = (data: LoginFormData) => {
    dispatch(loginUser(data));
  };

  return (
    <div className="relative flex flex-col justify-center w-full min-h-screen lg:flex-row bg-white">
      {/* Form Panel */}
      <div className="flex flex-col flex-1 p-6 sm:p-0">
        <div className="w-full max-w-md pt-10 mx-auto">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700"
          >
            <ChevronLeft className="size-5" />
            Back to store
          </Link>
        </div>
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-gray-500">
              Enter your email and password to sign in!
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-error-500 bg-error-50 p-4">
              <p className="text-sm text-error-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email <span className="text-error-500">*</span>
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 transition ${
                    errors.email
                      ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
                      : 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/20'
                  }`}
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-error-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Password <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 transition ${
                      errors.password
                        ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
                        : 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/20'
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-error-500">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 sm:text-start">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="text-brand-500 hover:text-brand-600"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Branding Panel */}
      <div className="hidden lg:grid w-full lg:w-1/2 h-screen bg-brand-950 items-center">
        <div className="relative flex items-center justify-center z-1">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="flex flex-col items-center max-w-xs relative">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center">
                <Package className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">ShopHub</span>
            </div>
            <p className="text-center text-gray-400">
              Your modern e-commerce platform for seamless shopping experiences
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
