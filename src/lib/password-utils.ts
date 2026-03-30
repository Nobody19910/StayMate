export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4; // 0=empty, 1=weak, 2=fair, 3=good, 4=strong
  label: string;
  color: string;
  errors: string[];
}

export function evaluatePassword(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "", color: "#94a3b8", errors: [] };

  const errors: string[] = [];
  if (password.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("One number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("One special character (!@#$...)");

  const passed = 5 - errors.length;
  if (passed <= 1) return { score: 1, label: "Weak", color: "#ef4444", errors };
  if (passed <= 2) return { score: 2, label: "Fair", color: "#f59e0b", errors };
  if (passed <= 3) return { score: 3, label: "Good", color: "#3b82f6", errors };
  return { score: 4, label: "Strong", color: "#06c167", errors };
}

export function isPasswordValid(password: string): boolean {
  return evaluatePassword(password).score >= 3;
}
