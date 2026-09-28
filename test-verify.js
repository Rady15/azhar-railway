const crypto = require("crypto");
const hash = "scrypt$1ab32fc4a9ca3ae239b6e27cb00e971b$fba6556a4733488ede60a0e0682bb8ac0b7f6b18ab6e0c2b621577faf2bf5967a8533070119bec31f6435d26d2132db95ba46a258d6c62914e10281fff828fac";
const [alg, saltHex, hashHex] = hash.split("$");
console.log("alg:", alg, "salt:", saltHex?.length, "hash:", hashHex?.length);
const expected = Buffer.from(hashHex, "hex");
const actual = crypto.scryptSync("Admin@123", Buffer.from(saltHex, "hex"), expected.length);
console.log("Match:", crypto.timingSafeEqual(expected, actual));
