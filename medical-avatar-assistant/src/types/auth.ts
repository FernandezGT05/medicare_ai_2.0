export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  picture?: string | null;
  phone?: string | null;
  bio?: string | null;
  updatedAt?: string;
}

export interface GoogleJwtPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}
