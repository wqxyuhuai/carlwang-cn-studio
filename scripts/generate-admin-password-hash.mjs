import bcrypt from "bcryptjs";

const password = process.argv[2] || "";
const errors = [];

if (password.length < 12) errors.push("Use at least 12 characters.");
if (!/[a-z]/.test(password)) errors.push("Add a lowercase letter.");
if (!/[A-Z]/.test(password)) errors.push("Add an uppercase letter.");
if (!/\d/.test(password)) errors.push("Add a number.");
if (!/[^A-Za-z0-9]/.test(password)) errors.push("Add a special character.");
if (["123456", "password", "admin123", "qwerty", "carlwang"].some((word) => password.toLowerCase().includes(word))) {
  errors.push("Avoid common password words.");
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log(hash);
