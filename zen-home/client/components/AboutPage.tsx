import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Users,
  MessageCircle,
  Shield,
  MapPin,
  Clock,
  Heart,
  Github,
  Globe,
  Info,
} from "lucide-react";

export const AboutPage = () => {
  const features = [
    {
      icon: Car,
      title: "Ride Sharing",
      description:
        "Post rides you're offering or seeking with detailed information including routes, timing, and available seats.",
    },
    {
      icon: MessageCircle,
      title: "In-App Messaging",
      description:
        "Communicate safely with other users through our secure messaging system without sharing personal contact information.",
    },
    {
      icon: Shield,
      title: "Secure Authentication",
      description:
        "Account verification with phone number authentication and password protection for your security.",
    },
    {
      icon: Users,
      title: "WhatsApp Integration",
      description:
        "Connect directly with group members through WhatsApp for quick coordination when you're both verified members.",
    },
    {
      icon: MapPin,
      title: "Route Planning",
      description:
        "Clear from-to location displays help you find rides that match your travel plans exactly.",
    },
    {
      icon: Clock,
      title: "Real-time Updates",
      description:
        "Live updates ensure you always see the latest ride information and message notifications.",
    },
  ];

  const stats = [
    { label: "Active Users", value: "100+", icon: Users },
    { label: "Rides Shared", value: "500+", icon: Car },
    { label: "Messages Sent", value: "1K+", icon: MessageCircle },
    { label: "Routes Covered", value: "50+", icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <div className="h-12 w-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
            <Car className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            RideShare Hub
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Connecting travelers and making shared transportation easier, safer,
          and more convenient for everyone in our community.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline">Version 2.0</Badge>
          <Badge variant="outline">Community Driven</Badge>
          <Badge variant="outline">Open Source</Badge>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Features Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Key Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex gap-4">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* How It Works Section */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="font-medium">Create Your Account</h4>
                <p className="text-sm text-muted-foreground">
                  Sign up with your phone number and create a secure password.
                  Your account is verified for safety.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="font-medium">Post or Find Rides</h4>
                <p className="text-sm text-muted-foreground">
                  Either offer a ride you're planning or search for rides that
                  match your travel needs.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="font-medium">Connect Safely</h4>
                <p className="text-sm text-muted-foreground">
                  Use our in-app messaging or WhatsApp integration to coordinate
                  with other travelers securely.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                4
              </div>
              <div>
                <h4 className="font-medium">Travel Together</h4>
                <p className="text-sm text-muted-foreground">
                  Meet up at the agreed location and enjoy a safe, shared
                  journey to your destination.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety & Privacy Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Safety & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 bg-green-500 rounded-full mt-2"></div>
              <p className="text-sm">
                <strong>Phone Verification:</strong> All users must verify their
                phone numbers to access the platform.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 bg-green-500 rounded-full mt-2"></div>
              <p className="text-sm">
                <strong>Private Messaging:</strong> Contact information is
                protected and only visible to verified users.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 bg-green-500 rounded-full mt-2"></div>
              <p className="text-sm">
                <strong>WhatsApp Groups:</strong> Additional verification for
                WhatsApp contact ensures community trust.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 bg-green-500 rounded-full mt-2"></div>
              <p className="text-sm">
                <strong>Secure Accounts:</strong> Password-protected accounts
                with the option for OTP recovery.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Community Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Community Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>
              <strong>Be Respectful:</strong> Treat all community members with
              kindness and respect. We're all here to help each other travel
              better.
            </p>
            <p>
              <strong>Share Accurately:</strong> Provide correct and up-to-date
              information about your rides. Update your posts if plans change.
            </p>
            <p>
              <strong>Communicate Clearly:</strong> Be clear about pickup
              locations, timing, and any special requirements for your rides.
            </p>
            <p>
              <strong>Stay Safe:</strong> Always meet in public places and trust
              your instincts. Don't share personal information beyond what's
              necessary.
            </p>
            <p>
              <strong>Be Reliable:</strong> Honor your commitments and
              communicate promptly if you need to make changes to shared travel
              plans.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>Built with ❤️ for our community of travelers</p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            <span>Web Platform</span>
          </div>
          <div className="flex items-center gap-1">
            <Github className="h-4 w-4" />
            <span>Open Source</span>
          </div>
        </div>
        <p className="text-xs">
          © 2024 RideShare Hub. Made for community, powered by technology.
        </p>
      </div>
    </div>
  );
};
