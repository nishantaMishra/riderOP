import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Phone,
  User,
  Lock,
  Shield,
  ArrowLeft,
  Timer,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = "login" | "register" | "forgot-password";
type AuthStep =
  | "mode-select"
  | "login-form"
  | "register-form"
  | "register-otp"
  | "forgot-password-form"
  | "forgot-password-otp"
  | "reset-password";

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<AuthStep>("mode-select");

  // Form fields
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [demoOTP, setDemoOTP] = useState<string>("");

  const { refreshAuth } = useAuth();
  const { toast } = useToast();

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  // Validation functions
  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Login with email/phone and password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast({
        title: "Validation Error",
        description: "Email/phone and password are required.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("auth-token", data.token);
        await refreshAuth();

        toast({
          title: "Welcome back!",
          description: "You have been logged in successfully.",
        });

        onClose();
        resetForm();
      } else {
        throw new Error(data.error || "Login failed");
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Registration: Request OTP
  const handleRequestRegistrationOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim() || !email.trim() || !name.trim()) {
      toast({
        title: "Validation Error",
        description: "All fields are required for registration.",
        variant: "destructive",
      });
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
          name: name.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("register-otp");
        setCountdown(60);
        setDemoOTP(data.demoOTP || "");

        toast({
          title: "OTP Sent!",
          description: `Verification code sent to ${email}`,
        });

        if (data.demoOTP) {
          toast({
            title: "Demo Mode",
            description: `Your OTP is: ${data.demoOTP}`,
            duration: 10000,
          });
        }
      } else {
        throw new Error(data.error || "Failed to send OTP");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Registration: Verify OTP and create account
  const handleVerifyRegistrationOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp.trim() || otp.trim().length !== 6) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid 6-digit OTP.",
        variant: "destructive",
      });
      return;
    }

    if (!password.trim() || password.trim().length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("auth-token", data.token);
        await refreshAuth();

        toast({
          title: "Account Created!",
          description: "Your account has been created successfully.",
        });

        onClose();
        resetForm();
      } else {
        throw new Error(data.error || "Failed to verify OTP");
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP or registration failed.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password: Request OTP
  const handleRequestPasswordResetOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/password-reset/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("forgot-password-otp");
        setCountdown(60);
        setDemoOTP(data.demoOTP || "");

        toast({
          title: "Reset Code Sent!",
          description: `Password reset code sent to ${email}`,
        });

        if (data.demoOTP) {
          toast({
            title: "Demo Mode",
            description: `Your reset code is: ${data.demoOTP}`,
            duration: 10000,
          });
        }
      } else {
        throw new Error(data.error || "Failed to send reset code");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset code.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp.trim() || otp.trim().length !== 6) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword.trim() || newPassword.trim().length < 6) {
      toast({
        title: "Validation Error",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/password-reset/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Password Reset!",
          description: "Your password has been reset successfully.",
        });

        setStep("mode-select");
        setMode("login");
        setPassword("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        throw new Error(data.error || "Failed to reset password");
      }
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep("mode-select");
    setMode("login");
    setPhoneNumber("");
    setEmail("");
    setName("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOtp("");
    setCountdown(0);
    setDemoOTP("");
    setShowPassword(false);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      resetForm();
    }
  };

  const getTitle = () => {
    switch (step) {
      case "mode-select":
        return "Welcome to RideShare Hub";
      case "login-form":
        return "Sign In";
      case "register-form":
        return "Create Account";
      case "register-otp":
        return "Verify Your Email";
      case "forgot-password-form":
        return "Reset Password";
      case "forgot-password-otp":
        return "Enter Reset Code";
      case "reset-password":
        return "Set New Password";
      default:
        return "Authentication";
    }
  };

  const canGoBack = () => {
    return step !== "mode-select";
  };

  const handleBack = () => {
    switch (step) {
      case "login-form":
      case "register-form":
      case "forgot-password-form":
        setStep("mode-select");
        break;
      case "register-otp":
        setStep("register-form");
        break;
      case "forgot-password-otp":
        setStep("forgot-password-form");
        break;
      case "reset-password":
        setStep("forgot-password-otp");
        break;
      default:
        setStep("mode-select");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {canGoBack() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-2 p-1"
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Shield className="h-5 w-5 text-primary" />
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selection */}
          {step === "mode-select" && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="font-medium mb-1">
                  🚗 Join our rideshare community!
                </p>
                <p>
                  Connect with fellow travelers, share rides, and save money
                  while helping the environment.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    setMode("login");
                    setStep("login-form");
                  }}
                  variant="outline"
                  className="h-16 flex-col gap-2"
                >
                  <LogIn className="h-5 w-5" />
                  <span>Sign In</span>
                </Button>
                <Button
                  onClick={() => {
                    setMode("register");
                    setStep("register-form");
                  }}
                  className="h-16 flex-col gap-2 bg-gradient-to-r from-primary to-secondary"
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Join Now</span>
                </Button>
              </div>
            </div>
          )}

          {/* Login Form */}
          {step === "login-form" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email or Phone *
                </Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com or phone number"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isLoading}
                    className="mt-1 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1 h-8 w-8 p-0"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setMode("forgot-password");
                    setStep("forgot-password-form");
                  }}
                  className="text-sm"
                >
                  Forgot your password?
                </Button>
              </div>
            </form>
          )}

          {/* Registration Form */}
          {step === "register-form" && (
            <form onSubmit={handleRequestRegistrationOTP} className="space-y-4">
              <div>
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isLoading}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We'll send a verification code to this email
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary"
                disabled={isLoading}
              >
                {isLoading ? "Sending Code..." : "Continue"}
              </Button>
            </form>
          )}

          {/* Registration OTP Verification */}
          {step === "register-otp" && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground bg-green-50 border border-green-200 p-3 rounded-lg">
                <p className="font-medium mb-1">📧 Code sent!</p>
                <p>
                  We've sent a verification code to <strong>{email}</strong>
                </p>
              </div>

              {demoOTP && (
                <div className="text-sm bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="font-medium text-yellow-800">Demo Mode</p>
                  <p className="text-yellow-700">
                    Your code: <strong>{demoOTP}</strong>
                  </p>
                </div>
              )}

              <form
                onSubmit={handleVerifyRegistrationOTP}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="otp" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Verification Code *
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    disabled={isLoading}
                    className="mt-1 text-center text-lg tracking-wider"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Create Password *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    disabled={isLoading}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    disabled={isLoading}
                    className="mt-1"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={handleRequestRegistrationOTP}
                  disabled={countdown > 0 || isLoading}
                  className="text-sm"
                >
                  {countdown > 0 ? (
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      Resend in {countdown}s
                    </span>
                  ) : (
                    "Resend code"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Forgot Password Form */}
          {step === "forgot-password-form" && (
            <form
              onSubmit={handleRequestPasswordResetOTP}
              className="space-y-4"
            >
              <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p>
                  Enter your email address and we'll send you a code to reset
                  your password.
                </p>
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary"
                disabled={isLoading}
              >
                {isLoading ? "Sending Code..." : "Send Reset Code"}
              </Button>
            </form>
          )}

          {/* Forgot Password OTP */}
          {step === "forgot-password-otp" && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground bg-green-50 border border-green-200 p-3 rounded-lg">
                <p className="font-medium mb-1">📧 Reset code sent!</p>
                <p>
                  Check your email at <strong>{email}</strong>
                </p>
              </div>

              {demoOTP && (
                <div className="text-sm bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="font-medium text-yellow-800">Demo Mode</p>
                  <p className="text-yellow-700">
                    Your reset code: <strong>{demoOTP}</strong>
                  </p>
                </div>
              )}

              <form
                onSubmit={() => setStep("reset-password")}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="otp" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Reset Code *
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    disabled={isLoading}
                    className="mt-1 text-center text-lg tracking-wider"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  disabled={!otp || otp.length !== 6}
                >
                  Continue
                </Button>
              </form>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={handleRequestPasswordResetOTP}
                  disabled={countdown > 0 || isLoading}
                  className="text-sm"
                >
                  {countdown > 0 ? (
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      Resend in {countdown}s
                    </span>
                  ) : (
                    "Resend code"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Reset Password */}
          {step === "reset-password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label
                  htmlFor="newPassword"
                  className="flex items-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  New Password *
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary"
                disabled={isLoading}
              >
                {isLoading ? "Resetting Password..." : "Reset Password"}
              </Button>
            </form>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center border-t pt-3">
          By continuing, you agree to our terms of service and privacy policy.
        </div>
      </DialogContent>
    </Dialog>
  );
};
