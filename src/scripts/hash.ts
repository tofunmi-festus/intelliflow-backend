import bcrypt from "bcrypt";

async function generateHashedPassword(plainPassword : string) {
  const saltRounds = 10;
  const hashed = await bcrypt.hash(plainPassword, saltRounds);
  console.log(hashed);
}

generateHashedPassword("Password8!");
