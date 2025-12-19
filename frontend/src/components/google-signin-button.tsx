"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "react-bootstrap";
import { useAuth } from "@/contexts/auth-context";
import { getGoogleOAuthClientId, isGoogleOAuthEnabledFromEnv } from "@/lib/google-oauth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: {
            type: string;
            theme: string;
            size: string;
            text: string;
            width?: string;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  variant?: "signin" | "signup";
  className?: string;
  disabled?: boolean;
}

export default function GoogleSignInButton({
  variant = "signin",
  className = "",
  disabled = false,
}: GoogleSignInButtonProps) {
  const { googleLogin } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Check if Google OAuth is enabled
    const checkEnabled = async () => {
      const envEnabled = await isGoogleOAuthEnabledFromEnv();
      const envClientId = await getGoogleOAuthClientId();
      
      if (envEnabled && envClientId) {
        setIsEnabled(true);
        setClientId(envClientId);
      } else {
        setIsEnabled(false);
      }
    };

    checkEnabled();
  }, []);

  const handleCredentialResponse = useCallback(async (response: { credential: string }) => {
    setLoading(true);
    try {
      await googleLogin(response.credential);
    } catch (error) {
      console.error("Google login failed:", error);
      // Error will be handled by auth context
    } finally {
      setLoading(false);
    }
  }, [googleLogin]);

  useEffect(() => {
    if (!isEnabled || !clientId || !buttonRef.current || initializedRef.current) {
      return;
    }

    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (window.google && buttonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
          });

          // Render the button
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: variant === "signin" ? "signin_with" : "signup_with",
            width: "100%",
          });

          initializedRef.current = true;
        } catch (error) {
          console.error("Failed to initialize Google Sign-In:", error);
        }
      }
    };

    script.onerror = () => {
      console.error("Failed to load Google Identity Services script");
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [isEnabled, clientId, variant, handleCredentialResponse]);

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      <div ref={buttonRef} className={className} style={{ width: "100%" }} />
      {loading && (
        <div className="text-center mt-2">
          <small className="text-muted">Signing in...</small>
        </div>
      )}
    </>
  );
}
