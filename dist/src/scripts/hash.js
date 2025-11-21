"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
async function generateHashedPassword(plainPassword) {
    const saltRounds = 10;
    const hashed = await bcrypt_1.default.hash(plainPassword, saltRounds);
    console.log(hashed);
}
generateHashedPassword("Password8!");
