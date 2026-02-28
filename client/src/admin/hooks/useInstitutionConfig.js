// src/admin/hooks/useInstitutionConfig.js
// Re-exports from the canonical location inside the classes feature folder.
// CoursesPage, PromotionPage and other pages outside the classes folder
// import from here via "../../../hooks/useInstitutionConfig".
export {
  useInstitutionConfig,
  getSemesterOptions,
  CONFIGS,
} from "../pages/classes/hooks/useInstitutionConfig";
