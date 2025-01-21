import { type Response } from "supertest";

export function checkFormOk(res: Response) {
  try {
    expect(res.status).toBe(302);
  } catch (e) {
    console.warn(res);
    const errors = res.get("X-Validation-Errors");
    if (errors) console.warn(JSON.parse(errors));
    throw e;
  }
}
