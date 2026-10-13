import bcryptjs from "bcryptjs";

function hash(password) {
  return bcryptjs.hash(password, getNumberOfRounds());
}

function getNumberOfRounds() {
  return Number(process.env.BCRYPT_ROUNDS || 14);
}

function compare(providedPassword, storedPassword) {
  return bcryptjs.compare(providedPassword, storedPassword);
}

const password = {
  hash,
  compare,
};

export default password;
