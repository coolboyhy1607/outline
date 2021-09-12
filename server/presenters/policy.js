// @flow
import { User } from "../models";

type Policy = { id: string, abilities: { [key: string]: boolean } };

export default function present(
  user: User | string,
  objects: Object[]
): Policy[] {
  const { serialize } = require("../policies");
  if (user !== "guest") {
    return objects.map((object) => ({
      id: object.id,
      abilities: serialize(user, object),
    }));
  } else {
    return objects.map((object) => ({
      id: object.id,
      abilities: {
        read: true,
      },
    }));
  }
}
