// server/src/utils/fileAccessPolicy.js

export const getExpiryByRole = (role) => {
  if (!role) return 60; // fallback

  switch (role.toUpperCase()) {
    case "SUPER_ADMIN":
      return 600; // 10 minutes

    case "ADMIN":
      return 300; // 5 minutes

    case "TEACHER":
      return 180; // 3 minutes

    case "PARENT":
      return 120; // 2 minutes

    case "STUDENT":
      return 60; // 1 minute

    default:
      return 60;
  }
};
