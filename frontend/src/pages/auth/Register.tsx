import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Package } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { registerUser, clearError } from '../../store/slices/authSlice';

const registerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const inputBaseClass =
  'h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 transition';
const inputDefaultClass = 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/20';
const inputErrorClass = 'border-error-500 focus:border-error-500 focus:ring-error-500/20';

const Register = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const onSubmit = async (data: RegisterFormData) => {
    const { confirm_password, ...registerData } = data;
    const result = await dispatch(registerUser(registerData));
    if (registerUser.fulfilled.match(result)) {
      navigate('/login');
    }
  };

  return (
    <div className="relative flex flex-col-reverse w-full min-h-screen lg:flex-row bg-white">
      {/* Branding Panel — Left */}
      <div className="hidden lg:grid w-full lg:w-1/2 h-screen bg-brand-950 items-center sticky top-0">
        <div className="relative flex items-center justify-center z-1">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="flex flex-col items-center max-w-sm relative">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              <span className="text-4xl font-bold text-white tracking-tight">ShopHub</span>
            </div>
            <p className="text-center text-brand-200/60 text-lg leading-relaxed">
              Your modern e-commerce platform for seamless shopping experiences
            </p>
          </div>
        </div>
      </div>

      {/* Form Panel — Right */}
      <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 p-6 sm:p-0">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto py-10">
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm sm:text-title-md">
              Sign Up
            </h1>
            <p className="text-sm text-gray-500">
              Create your account to get started!
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-error-500 bg-error-50 p-4">
              <p className="text-sm text-error-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    First Name <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('first_name')}
                    className={`${inputBaseClass} ${errors.first_name ? inputErrorClass : inputDefaultClass}`}
                    placeholder="Enter your first name"
                  />
                  {errors.first_name && (
                    <p className="mt-1.5 text-xs text-error-500">{errors.first_name.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Last Name <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('last_name')}
                    className={`${inputBaseClass} ${errors.last_name ? inputErrorClass : inputDefaultClass}`}
                    placeholder="Enter your last name"
                  />
                  {errors.last_name && (
                    <p className="mt-1.5 text-xs text-error-500">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email <span className="text-error-500">*</span>
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className={`${inputBaseClass} ${errors.email ? inputErrorClass : inputDefaultClass}`}
                  placeholder="Enter your email"
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
                    className={`${inputBaseClass} pr-11 ${errors.password ? inputErrorClass : inputDefaultClass}`}
                    placeholder="At least 6 characters"
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

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Confirm Password <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    {...register('confirm_password')}
                    className={`${inputBaseClass} pr-11 ${errors.confirm_password ? inputErrorClass : inputDefaultClass}`}
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirm ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="mt-1.5 text-xs text-error-500">{errors.confirm_password.message}</p>
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
                    Creating account...
                  </span>
                ) : (
                  'Sign Up'
                )}
              </button>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 sm:text-start">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-brand-500 hover:text-brand-600"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
