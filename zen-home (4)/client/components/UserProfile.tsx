import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  User,
  Mail,
  Phone,
  Lock,
  Edit,
  Save,
  X,
  Shield,
  Calendar,
} from "lucide-react";

export const UserProfile = () => {
  const { user, refreshAuth } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [newName, setNewName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing
      setNewName(user?.name || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Validate inputs
    if (!newName.trim()) {
      toast({
        title: "Validation Error",
        description: "Name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    // Check if anything changed
    const nameChanged = newName.trim() !== user.name;
    const passwordChanged = newPassword.trim().length > 0;

    if (!nameChanged && !passwordChanged) {
      setIsEditing(false);
      return;
    }

    // Password validation if changing password
    if (passwordChanged) {
      if (!currentPassword.trim()) {
        toast({
          title: "Validation Error",
          description: "Current password is required to change password.",
          variant: "destructive",
        });
        return;
      }

      if (newPassword.length < 6) {
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
          description: "New passwords do not match.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      // Since we don't have an update profile endpoint yet, we'll show what would happen
      toast({
        title: "Demo Mode",
        description:
          "Profile updates would be saved here. In a full implementation, this would update the user's information in the database.",
      });

      // In a real implementation, you would make an API call like:
      // const response = await fetch('/api/auth/update-profile', {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      //   },
      //   body: JSON.stringify({
      //     name: newName.trim(),
      //     currentPassword: currentPassword.trim(),
      //     newPassword: passwordChanged ? newPassword.trim() : undefined
      //   })
      // });

      setIsEditing(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // await refreshAuth(); // Refresh user data
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Your Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Name
              </Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Your full name"
                  disabled={isLoading}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 p-2 bg-muted rounded border">
                  {user.name}
                </div>
              )}
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <div className="mt-1 p-2 bg-muted rounded border">
                {user.email}
                <div className="text-xs text-muted-foreground mt-1">
                  📧 Verified
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed for security reasons. Contact support if
                needed.
              </p>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <div className="mt-1 p-2 bg-muted rounded border">
                {user.phoneNumber}
                <div className="text-xs text-muted-foreground mt-1">
                  📱 Verified
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Phone number cannot be changed for security reasons. Contact
                support if needed.
              </p>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Member Since
              </Label>
              <div className="mt-1 p-2 bg-muted rounded border">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Password Change Section */}
          {isEditing && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Change Password (Optional)
              </h4>

              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={handleEditToggle}
                  variant="outline"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={handleEditToggle}
                className="flex-1 bg-gradient-to-r from-primary to-secondary"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>

          {/* Security Notice */}
          <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-3 w-3 text-amber-600" />
              <span className="font-medium text-amber-800">
                Security Notice
              </span>
            </div>
            <p className="text-amber-700">
              Your email and phone number are secured and verified. These cannot
              be changed to protect your account security.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
