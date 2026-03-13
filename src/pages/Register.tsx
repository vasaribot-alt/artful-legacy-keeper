import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Role = "artist" | "collector" | "registrar";

const roles: { value: Role; label: string; description: string }[] = [
  { value: "artist", label: "Artist", description: "Build your catalogue raisonné" },
  { value: "collector", label: "Collector", description: "Manage your collection" },
  { value: "registrar", label: "Registrar", description: "Help catalogue artworks" },
];

const Register = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("artist");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    // Validate invite code if provided
    if (inviteCode.trim()) {
      const { data: codeData } = await supabase
        .from("invite_codes")
        .select("id, code, tier, used_by, is_active")
        .eq("code", inviteCode.trim().toUpperCase())
        .single();

      if (!codeData) {
        toast.error("Invalid invite code");
        return;
      }
      if (!codeData.is_active) {
        toast.error("This invite code is no longer active");
        return;
      }
      if (codeData.used_by) {
        toast.error("This invite code has already been used");
        return;
      }
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, role: selectedRole, invite_code: inviteCode.trim().toUpperCase() || undefined },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else if (data.user) {
      toast.success("Account created! Check your email to confirm.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="text-lg font-semibold tracking-tight block mb-10">
          Global Artist Registry Foundation
        </Link>
        <h1 className="text-3xl mb-2">Create your vault</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Register to start documenting and preserving art.
        </p>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1.5"
            />
          </div>

          {/* Role selection */}
          <div>
            <Label>I am a</Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {roles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className={`p-3 rounded-sm border text-left transition-colors ${
                    selectedRole === role.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <span className="text-sm font-medium block">{role.label}</span>
                  <span className={`text-xs ${selectedRole === role.value ? "text-background/70" : "text-muted-foreground"}`}>
                    {role.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground mt-6 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-foreground underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
