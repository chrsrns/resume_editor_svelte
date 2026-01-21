// Core client utilities
export { ApiError, apiRequest, unwrapBody, getApiBaseUrl } from './client';

// Authentication
export {
    register,
    login,
    me,
    logout
} from './auth';

// Resume management
export {
    listResumes,
    getResume,
    createResume,
    updateResume,
    deleteResume
} from './resumes';

// Skills management
export {
    listSkills,
    createSkill,
    updateSkill,
    deleteSkill
} from './skills';

// Languages management
export {
    listLanguages,
    createLanguage,
    updateLanguage,
    deleteLanguage
} from './languages';

// Frameworks management
export {
    listFrameworks,
    createFramework,
    updateFramework,
    deleteFramework
} from './frameworks';

// Education management
export {
    listEducations,
    createEducation,
    updateEducation,
    deleteEducation,
    listEducationKeyPoints,
    createEducationKeyPoint,
    updateEducationKeyPoint,
    deleteEducationKeyPoint
} from './education';

// Work experience management
export {
    listWorkExperiences,
    createWorkExperience,
    updateWorkExperience,
    deleteWorkExperience,
    listWorkExperienceKeyPoints,
    createWorkExperienceKeyPoint,
    updateWorkExperienceKeyPoint,
    deleteWorkExperienceKeyPoint
} from './work-experience';

// Portfolio management
export {
    listPortfolioProjects,
    createPortfolioProject,
    updatePortfolioProject,
    deletePortfolioProject,
    listPortfolioKeyPoints,
    createPortfolioKeyPoint,
    updatePortfolioKeyPoint,
    deletePortfolioKeyPoint,
    listPortfolioTechnologies,
    createPortfolioTechnology,
    updatePortfolioTechnology,
    deletePortfolioTechnology
} from './portfolio';
