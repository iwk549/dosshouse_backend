const {
  saltAndHashPassword,
  comparePasswords,
  trimEmail,
} = require("../../../utils/users");

describe("users util", () => {
  describe("saltAndHashPassword", () => {
    it("should return a salted and hashed password", async () => {
      const res = await saltAndHashPassword("Password1");
      expect(res).toEqual(expect.any(String));
    });
    test("two different passwords should yield different hashes", async () => {
      const res1 = await saltAndHashPassword("Password1");
      const res2 = await saltAndHashPassword("Password2");
      expect(res1).not.toBe(res2);
    });
  });

  describe("comparePasswords", () => {
    it("should return true if passwords match", async () => {
      const pw = "Password1";
      const hashed = await saltAndHashPassword(pw);
      const res = await comparePasswords(pw, hashed);
      expect(res).toBe(true);
    });
    it("should return false if passwords dont match", async () => {
      const hashed = await saltAndHashPassword("Password1");
      const res = await comparePasswords("password1", hashed);
      expect(res).toBe(false);
    });
  });

  describe("trimEmail", () => {
    it("should return an empty string if falsy value passed", () => {
      const res = trimEmail();
      expect(res).toBe("");
    });
    it("should remove the whitespace from the left and right and convert to lower case", () => {
      const res = trimEmail("     EmaIL   ");
      expect(res).toBe("email");
    });
  });
});
