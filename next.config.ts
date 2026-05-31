import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin Turbopack's root to this project so it doesn't pick up the user's
  // home-directory lockfile (Windows: %USERPROFILE%\package-lock.json) and
  // emit "multiple lockfiles" warnings.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
