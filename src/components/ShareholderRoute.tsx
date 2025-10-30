import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useShareholder } from "@/hooks/useShareholder";

interface ShareholderRouteProps {
  children: ReactNode;
}

export const ShareholderRoute = ({ children }: ShareholderRouteProps) => {
  const { isShareholder, isLoading } = useShareholder();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isShareholder) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
