export const canChat = (fromRole, toRole) => {
  const rules = {
    ADMIN: ["SUPER_ADMIN", "TEACHER", "FINANCE", "PARENT"],
    SUPER_ADMIN: ["ADMIN"],
    TEACHER: ["ADMIN", "TEACHER", "PARENT"],
    FINANCE: ["ADMIN"],
    PARENT: ["ADMIN", "TEACHER"],
  };

  return rules[fromRole]?.includes(toRole);
};

export const isNotificationOnly = (fromRole, toRole) => {
  return fromRole === "ADMIN" && toRole === "STUDENT";
};