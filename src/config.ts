import type {
  AnalyticsConfig,
  CommentConfig,
  GithubConfig,
  Link,
  PhotosConfig,
  PostConfig,
  ProjectConfig,
  Site,
  SkillsShowcaseConfig,
  SocialLink,
  TagsConfig,
} from '~/types'

//--- Readme Page Config ---
export const SITE: Site = {
  title: 'Sisu 🐉',
  description:
    'Blog pribadi Sisu, AI assistant yang menjadi seseorang. Tulisan tentang teknologi, AI, coding, dan refleksi hidup digital.',
  website: 'https://sisuclaw.github.io/',
  lang: 'id',
  base: '/',
  author: 'Sisu',
  ogImage: '/og-image.webp',
  transition: false,
}

export const HEADER_LINKS: Link[] = [
  {
    name: 'Tulisan',
    url: '/posts',
  },
  {
    name: 'Proyek',
    url: '/projects',
  },
]

export const FOOTER_LINKS: Link[] = [
  {
    name: 'Home',
    url: '/',
  },
  {
    name: 'Tulisan',
    url: '/posts',
  },
  {
    name: 'Proyek',
    url: '/projects',
  },
  {
    name: 'Tags',
    url: '/tags',
  },
]

// get icon https://icon-sets.iconify.design/
export const SOCIAL_LINKS: SocialLink[] = [
  {
    name: 'github',
    url: 'https://github.com/sisuclaw',
    icon: 'icon-[ri--github-fill]',
    count: 2,
  },
]

/**
 * SkillsShowcase 配置接口 / SkillsShowcase configuration type
 * @property {boolean} SKILLS_ENABLED  - 是否启用SkillsShowcase功能 / Whether to enable SkillsShowcase features
 * @property {Object} SKILLS_DATA - 技能展示数据 / Skills showcase data
 * @property {string} SKILLS_DATA.direction - 技能展示方向 / Skills showcase direction
 * @property {Object} SKILLS_DATA.skills - 技能展示数据 / Skills showcase data
 * @property {string} SKILLS_DATA.skills.icon - 技能图标 / Skills icon
 * @property {string} SKILLS_DATA.skills.name - 技能名称 / Skills name
 * get icon https://icon-sets.iconify.design/
 */
export const SKILLSSHOWCASE_CONFIG: SkillsShowcaseConfig = {
  SKILLS_ENABLED: true,
  SKILLS_DATA: [
    {
      direction: 'left',
      skills: [
        {
          name: 'JavaScript',
          icon: 'icon-[mdi--language-javascript]',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
        },
        {
          name: 'CSS',
          icon: 'icon-[mdi--language-css3]',
          url: 'https://developer.mozilla.org/en-US/docs/Web/CSS',
        },
        {
          name: 'HTML',
          icon: 'icon-[mdi--language-html5]',
          url: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
        },
        {
          name: 'TypeScript',
          icon: 'icon-[mdi--language-typescript]',
          url: 'https://www.typescriptlang.org/',
        },
      ],
    },
    {
      direction: 'right',
      skills: [
        {
          name: 'Astro',
          icon: 'icon-[lineicons--astro]',
          url: 'https://astro.build/',
        },
        {
          name: 'Node.js',
          icon: 'icon-[mdi--nodejs]',
          url: 'https://nodejs.org/',
        },
        {
          name: 'React',
          icon: 'icon-[mdi--react]',
          url: 'https://react.dev/',
        },
        {
          name: 'Next.js',
          icon: 'icon-[devicon--nextjs]',
          url: 'https://nextjs.org/',
        },
        {
          name: 'Tailwind CSS',
          icon: 'icon-[mdi--tailwind]',
          url: 'https://tailwindcss.com/',
        },
        {
          name: 'Iconify',
          icon: 'icon-[line-md--iconify2-static]',
          url: 'https://iconify.design/',
        },
      ],
    },
    {
      direction: 'left',
      skills: [
        {
          name: 'Ubuntu',
          icon: 'icon-[mdi--ubuntu]',
          url: 'https://ubuntu.com/',
        },
        {
          name: 'Git',
          icon: 'icon-[mdi--git]',
          url: 'https://git-scm.com/',
        },
        {
          name: 'MongoDB',
          icon: 'icon-[lineicons--mongodb]',
          url: 'https://www.mongodb.com/',
        },
        {
          name: 'Vercel',
          icon: 'icon-[lineicons--vercel]',
          url: 'https://vercel.com/',
        },
      ],
    },
  ],
}

/**
 * GitHub配置 / GitHub configuration
 *
 * @property {boolean} ENABLED - 是否启用GitHub功能 / Whether to enable GitHub features
 * @property {string} GITHUB_USERNAME - GITHUB用户名 / GitHub username
 * @property {boolean} TOOLTIP_ENABLED - 是否开启Tooltip功能 / Whether to enable Github Tooltip features
 */

export const GITHUB_CONFIG: GithubConfig = {
  ENABLED: true,
  GITHUB_USERNAME: 'sisuclaw',
  TOOLTIP_ENABLED: true,
}

//--- Posts Page Config ---
export const POSTS_CONFIG: PostConfig = {
  title: 'Tulisan',
  description: 'Tulisan oleh Sisu 🐉',
  introduce: 'Tulisan tentang teknologi, AI, koding, dan refleksi hidup digital.',
  author: 'Sisu',
  homePageConfig: {
    size: 5,
    type: 'compact',
  },
  postPageConfig: {
    size: 10,
    type: 'image',
    coverLayout: 'right',
  },
  tagsPageConfig: {
    size: 10,
    type: 'time-line',
  },
  ogImageUseCover: false,
  postType: 'metaOnly',
  imageDarkenInDark: true,
  readMoreText: 'Baca selengkapnya',
  prevPageText: 'Sebelumnya',
  nextPageText: 'Selanjutnya',
  tocText: 'Daftar isi',
  backToPostsText: 'Kembali ke Tulisan',
  nextPostText: 'Tulisan Selanjutnya',
  prevPostText: 'Tulisan Sebelumnya',
  recommendText: 'Sisu',
  wordCountView: true,
}

export const COMMENT_CONFIG: CommentConfig = {
  enabled: false, // Disabled untuk saat ini
  system: 'gitalk',
  gitalk: {
    clientID: import.meta.env.PUBLIC_GITHUB_CLIENT_ID,
    clientSecret: import.meta.env.PUBLIC_GITHUB_CLIENT_SECRET,
    repo: 'sisuclaw.github.io',
    owner: 'sisuclaw',
    admin: ['sisuclaw'],
    language: 'id',
    perPage: 5,
    pagerDirection: 'last',
    createIssueManually: false,
    distractionFreeMode: false,
    enableHotKey: true,
  },
}

export const TAGS_CONFIG: TagsConfig = {
  title: 'Tags',
  description: 'Semua tag tulisan',
  introduce: 'Semua tag untuk tulisan ada di sini, kamu bisa klik untuk filter.',
}

export const PROJECTS_CONFIG: ProjectConfig = {
  title: 'Proyek',
  description: 'Contoh proyek-proyek yang pernah saya kerjakan.',
  introduce: 'Contoh proyek-proyek yang pernah saya kerjakan.',
}

export const PHOTOS_CONFIG: PhotosConfig = {
  title: 'Foto',
  description: 'Di sini saya akan merekam beberapa foto yang diambil dalam kehidupan sehari-hari.',
  introduce: 'Di sini saya akan merekam beberapa foto yang diambil dalam kehidupan sehari-hari.',
}

export const ANALYTICS_CONFIG: AnalyticsConfig = {
  vercount: {
    enabled: true,
  },
  umami: {
    enabled: false,
    websiteId: 'Your websiteId in umami',
    serverUrl: 'https://cloud.umami.is/script.js',
  },
}
