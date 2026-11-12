// Bangla fixed-UI dictionary — same keys as src/i18n/en.ts, faithful
// translations of the English strings (no new claims). Content
// (titles, descriptions, lyrics) is NOT here: it comes from the
// collections / API and is localised per-item via the optional
// nested `bn` object (see lib/i18n.ts).

export interface Dict {
	navWork: string;
	navVentures: string;
	navReleases: string;
	navProjects: string;
	navCaseStudies: string;
	navPosts: string;
	navAbout: string;
	navContact: string;
	navHome: string;
	profileSe: string;
	profileKnowMe: string;
	chooseProfile: string;
	resumeRotation: string;
	openMenu: string;
	closeMenu: string;
	mobileNav: string;
	primaryNav: string;
	switchLanguage: string;
	switchToLight: string;
	switchToDark: string;
	heroHeadline: string;
	heroDescription: string;
	knowMeHeadline: string;
	knowMeSub: string;
	heroLocation: string;
	photoAlt: string;
	viewMyWork: string;
	contactMe: string;
	listenReleases: string;
	followConnect: string;
	projectsShipped: string;
	ordersDaily: string;
	designationSe: string[];
	designationKnowMe: string[];
	statYears: string;
	statProjects: string;
	statClients: string;
	statReleases: string;
	releasesSub: string;
	servicesTitle: string;
	servicesSub: string;
	learnMoreAbout: string;
	contactAboutService: string;
	openingContact: string;
	close: string;
	projectsTitle: string;
	projectsSub: string;
	viewAllProjects: string;
	viewAllCaseStudies: string;
	viewAllPosts: string;
	viewAllReleases: string;
	viewAllVentures: string;
	caseStudiesTitle: string;
	caseStudiesSub: string;
	readCaseStudy: string;
	stackTitle: string;
	stackSub: string;
	stackFilter: string;
	nowLabel: string;
	spin: string;
	spinLabel: string;
	globeHint: string;
	catFrontend: string;
	catBackend: string;
	catDatabase: string;
	catCloudTools: string;
	catCmsEcommerce: string;
	catConcepts: string;
	catAuth: string;
	beyondTitle: string;
	beyondSub: string;
	entrepreneurTitle: string;
	entrepreneurText: string;
	venturesEmptyShort: string;
	artistTitle: string;
	artistPoints: string[];
	wantWholePicture: string;
	wholePictureText: string;
	knowMeCta: string;
	clientsTitle: string;
	latestPostsTitle: string;
	latestPostsSub: string;
	contactTitle: string;
	contactSub: string;
	wholePersonTitle: string;
	aboutP1: string;
	aboutP2: string;
	aboutP3: string;
	identitySeText: string;
	identityEntrepreneurText: string;
	identityArtistText: string;
	identityHafizText: string;
	identityPublicText: string;
	publicFigureTitle: string;
	publicFigureTitles: string[];
	publicFigureVentures: string;
	publicFigureSocial: string;
	publicFigureVoice: string;
	findSocial: string;
	listenNasheed: string;
	selectedProjects: string;
	reachOutTitle: string;
	reachOutSub: string;
	platformsTitle: string;
	platformsIntro: string;
	platformsMusic: string;
	platformsMusicBlurb: string;
	platformsSocial: string;
	platformsSocialBlurb: string;
	platformsProfessional: string;
	platformsProfessionalBlurb: string;
	backHome: string;
	homeName: string;
	allProjects: string;
	allPosts: string;
	allReleases: string;
	allVentures: string;
	allCaseStudies: string;
	allChip: string;
	moreFilters: string;
	showingProjects: string;
	showingPosts: string;
	showingReleases: string;
	showingVentures: string;
	emptyProjects: string;
	emptyPosts: string;
	emptyCaseStudies: string;
	emptyVentures: string;
	emptyReleases: string;
	releaseTypeNasheed: string;
	releaseTypeTilawat: string;
	releaseTypePodcast: string;
	releaseTypeLecture: string;
	releaseTypeOther: string;
	audioOnly: string;
	viewDetailsFor: string;
	availableOn: string;
	backAllProjects: string;
	backAllPosts: string;
	backAllReleases: string;
	backAllVentures: string;
	backAllCaseStudies: string;
	backCaseStudy: string;
	aboutProject: string;
	aboutRelease: string;
	aboutVenture: string;
	problem: string;
	fix: string;
	result: string;
	research: string;
	tune: string;
	lyricist: string;
	lyrics: string;
	listenWatch: string;
	videoLabel: string;
	audioLabel: string;
	publishedLabel: string;
	clientLabel: string;
	roleLabel: string;
	categoryLabel: string;
	statusLabel: string;
	liveSiteLabel: string;
	visitSite: string;
	stageLabel: string;
	locationLabel: string;
	teamSizeLabel: string;
	foundedLabel: string;
	websiteLabel: string;
	visitWebsite: string;
	projectLabel: string;
	viewProject: string;
	authorBy: string;
	authorLine: string;
	morePosts: string;
	previous: string;
	next: string;
	previousProject: string;
	nextProject: string;
	previousClient: string;
	nextClient: string;
	loadingProjects: string;
	builtWith: string;
	notFoundProject: string;
	notFoundPost: string;
	notFoundRelease: string;
	notFoundVenture: string;
	notFoundCaseStudy: string;
	pageNotFound: string;
	pageNotFoundText: string;
	notPublishedProject: string;
	notPublishedPost: string;
	notPublishedRelease: string;
	notPublishedVenture: string;
	notPublishedCaseStudy: string;
	wantSystemLike: string;
	discussSimilarProject: string;
	discussSimilarVenture: string;
	facingSimilar: string;
	caseStudyCtaText: string;
	ventureCtaText: string;
	projectCtaText: string;
	thinkingVenture: string;
	formName: string;
	formNamePlaceholder: string;
	formEmail: string;
	formEmailPlaceholder: string;
	formPhone: string;
	formPhonePlaceholder: string;
	formService: string;
	formSelectService: string;
	formMessage: string;
	formMessagePlaceholder: string;
	formSend: string;
	formSending: string;
	formThanks: string;
	formReplyPersonal: string;
	formSendAnother: string;
	formPreferEmail: string;
	formErrorName: string;
	formErrorContact: string;
	formErrorEmail: string;
	formErrorPhone: string;
	formHintContact: string;
	formPreselected: string;
	modalSub: string;
	footerSubSe: string;
	footerSubKnowMe: string;
	footerAllPlatforms: string;
	footerRights: string;
	playVideo: string;
	playHere: string;
	watchOnYouTube: string;
	galleryLabel: string;
	videosLabel: string;
	prevImages: string;
	nextImages: string;
	prevVideos: string;
	nextVideos: string;
	mediaCounter: string;
	galleryImage: string;
	audioRelease: string;
	ventureMetrics: string;
	homeTitle: string;
	homeDescription: string;
	knowMeTitle: string;
	knowMeDescription: string;
	platformsPageTitle: string;
	platformsPageDescription: string;
	projectsPageTitle: string;
	projectsPageDescription: string;
	postsPageTitle: string;
	postsPageDescription: string;
	releasesPageTitle: string;
	releasesPageDescription: string;
	venturesPageTitle: string;
	venturesPageDescription: string;
	caseStudiesPageTitle: string;
	caseStudiesPageDescription: string;
}

export const bn: Dict = {
	navWork: "কাজ",
	navVentures: "উদ্যোগ",
	navReleases: "রিলিজ",
	navProjects: "প্রজেক্ট",
	navCaseStudies: "কেস স্টাডি",
	navPosts: "পোস্ট",
	navAbout: "আমার সম্পর্কে",
	navContact: "যোগাযোগ",
	navHome: "হোম",
	profileSe: "সফটওয়্যার ইঞ্জিনিয়ার",
	profileKnowMe: "আমাকে জানুন",
	chooseProfile: "একটা প্রোফাইল বেছে নিন",
	resumeRotation: "অটো-রোটেশন চালু করুন",
	openMenu: "মেনু খুলুন",
	closeMenu: "মেনু বন্ধ করুন",
	mobileNav: "মোবাইল মেনু",
	primaryNav: "প্রধান মেনু",
	switchLanguage: "ভাষা বদলান",
	switchToLight: "লাইট মোডে যান",
	switchToDark: "ডার্ক মোডে যান",
	heroHeadline: "আমি এমন প্রোডাক্ট বানাই, যার ওপর মানুষ প্রতিদিন ভরসা করে।",
	heroDescription:
		"বাংলাদেশ আর বিশ্বের বিজনেসের জন্য ERP, ই-কমার্স আর SaaS সিস্টেম — বাস্তব চাপে টিকে থাকার মতো করে বানানো।",
	knowMeHeadline:
		"সফটওয়্যার ইঞ্জিনিয়ার, উদ্যোক্তা ও নাশিদ শিল্পী — এক মানুষ, পাঁচটি পরিচয়।",
	knowMeSub:
		"মাহমুদুল হাসান রিয়াজ — একজন হাফিজ-আলেম, যিনি ERP ও ই-কমার্স সফটওয়্যার বানান, তিনটা উদ্যোগ শুরু করেছেন, আর বিশ্বজুড়ে শ্রোতাদের সঙ্গে নাশিদ, তিলাওয়াত ও বক্তব্য শেয়ার করেন।",
	heroLocation: "ঢাকা, বাংলাদেশ",
	photoAlt: "মাহমুদুল হাসান রিয়াজ মঞ্চে বক্তব্য দিচ্ছেন",
	viewMyWork: "আমার কাজ দেখুন",
	contactMe: "যোগাযোগ করুন",
	listenReleases: "রিলিজগুলো শুনুন",
	followConnect: "ফলো করুন ও যুক্ত থাকুন",
	projectsShipped: "প্রজেক্ট সম্পন্ন",
	ordersDaily: "প্রতিদিন সামলানো অর্ডার",
	designationSe: ["সফটওয়্যার ইঞ্জিনিয়ার"],
	designationKnowMe: [
		"সফটওয়্যার ইঞ্জিনিয়ার",
		"উদ্যোক্তা",
		"নাশিদ শিল্পী",
		"হাফিজ-আলেম",
		"পাবলিক ফিগার",
	],
	statYears: "বছরের অভিজ্ঞতা",
	statProjects: "প্রজেক্ট",
	statClients: "ক্লায়েন্ট",
	statReleases: "রিলিজ",
	releasesSub:
		"নাশিদ, তিলাওয়াত, পডকাস্ট ও লেকচার — প্রতিটি রিলিজ, যে প্ল্যাটফর্মে আছে সেইসহ।",
	servicesTitle: "সার্ভিস",
	servicesSub: "আপনার বিজনেসের জন্য আমি যা বানাতে আর ইমপ্রুভ করতে পারি।",
	learnMoreAbout: "সম্পর্কে আরও জানুন",
	contactAboutService: "এই সার্ভিসটা নিয়ে কথা বলুন",
	openingContact: "কন্ট্যাক্ট ফর্ম খুলছে…",
	close: "বন্ধ করুন",
	projectsTitle: "প্রজেক্ট",
	projectsSub: "সিলেক্টেড কাজ — আসল বিজনেস চালানো আসল সিস্টেম।",
	viewAllProjects: "সব প্রজেক্ট দেখুন →",
	viewAllCaseStudies: "সব কেস স্টাডি দেখুন →",
	viewAllPosts: "সব পোস্ট দেখুন →",
	viewAllReleases: "সব রিলিজ দেখুন →",
	viewAllVentures: "সব উদ্যোগ দেখুন →",
	caseStudiesTitle: "কেস স্টাডি",
	caseStudiesSub:
		"সমস্যা, সমাধান, ফলাফল — প্রতিটি এক লাইনে। পুরো গল্প পড়তে কেস স্টাডিতে ট্যাপ করুন।",
	readCaseStudy: "কেস স্টাডিটা পড়ুন",
	stackTitle: "আমি যে স্ট্যাকে কাজ করি",
	stackSub:
		"উপরের প্রোডাক্টগুলোর পেছনের টুলস — সবগুলো দেখতে গ্লোবটা টেনে ঘোরান।",
	stackFilter: "ক্যাটাগরি অনুযায়ী স্ট্যাক ছাঁকুন",
	nowLabel: "এখন:",
	spin: "ঘোরান",
	spinLabel: "গ্লোব ঘুরিয়ে একটা র‍্যান্ডম টেকনোলজি দেখুন",
	globeHint:
		"টেনে ঘোরান · বিস্তারিত দেখতে কোনো টেকনোলজিতে ট্যাপ করুন — ৪৪টা টেকনোলজিই গ্লোবে আছে।",
	catFrontend: "ফ্রন্টএন্ড",
	catBackend: "ব্যাকএন্ড",
	catDatabase: "ডেটাবেজ",
	catCloudTools: "ক্লাউড ও টুলস",
	catCmsEcommerce: "CMS ও ই-কমার্স",
	catConcepts: "কনসেপ্ট",
	catAuth: "অথেন্টিকেশন",
	beyondTitle: "কোডের বাইরে",
	beyondSub:
		"এক মানুষ, আরও দুটি পরিচয় — কোম্পানি গড়া, আর নাশিদ রেকর্ড করা।",
	entrepreneurTitle: "উদ্যোক্তা ও পাবলিক ফিগার",
	entrepreneurText:
		"তিনটা উদ্যোগের ফাউন্ডার — পাশাপাশি ঢাকায় কমিউনিটি আর চ্যারিটি উদ্যোগ, আর ঈমান, কাজ আর টেকনোলজি নিয়ে কথা।",
	venturesEmptyShort: "পাবলিশ হলে এখানে উদ্যোগগুলো দেখা যাবে।",
	artistTitle: "ইসলামিক শিল্পী",
	artistPoints: [
		"নাশিদ, তিলাওয়াত, পডকাস্ট ও লেকচার রিলিজ",
		"হাফিজ — কুরআন মুখস্থ করেছেন; ইসলামিক স্কলার",
		"ইউটিউব আর স্পটিফায়ে ১০+ রিলিজ",
	],
	wantWholePicture: "পুরো ছবিটা দেখতে চান?",
	wholePictureText:
		"প্রতিটা উদ্যোগ আর প্রতিটা রিলিজ, পুরোপুরি — আমাকে জানুন পেজে।",
	knowMeCta: "আমাকে জানুন →",
	clientsTitle: "ক্লায়েন্ট",
	latestPostsTitle: "লেটেস্ট পোস্ট",
	latestPostsSub: "বানানো নিয়ে নোট, আর নাশিদের কাজ নিয়ে।",
	contactTitle: "কোনো প্রজেক্টের কথা ভাবছেন?",
	contactSub:
		"কী বানাচ্ছেন, জানান — আমি নিজে উত্তর দিই, সাধারণত এক দিনের মধ্যে।",
	wholePersonTitle: "পুরো মানুষটি",
	aboutP1:
		"মাহমুদুল হাসান রিয়াজ ঢাকার একজন সফটওয়্যার ইঞ্জিনিয়ার। তিনি বাংলাদেশ আর বিশ্বের বিজনেসের জন্য ERP, ই-কমার্স আর SaaS সিস্টেম বানান।",
	aboutP2:
		"তিনি একজন উদ্যোক্তা আর পাবলিক ফিগারও — বাংলাদেশি বিজনেসের আসল সমস্যার সমাধান হয়, এমন কোম্পানি গড়ছেন; আর সরাসরি ও অনলাইনে কথা বলেন, শেখান, শেয়ার করেন।",
	aboutP3:
		"নাশিদ শিল্পী ও হাফিজ-আলেম হিসেবে তিনি বাদ্যযন্ত্র ছাড়া নাশিদ রেকর্ড করেন — শুধু কণ্ঠ, কথা আর অর্থ।",
	identitySeText:
		"বাংলাদেশ আর বিশ্বের বিজনেসের জন্য ERP, ই-কমার্স আর SaaS সিস্টেম বানান।",
	identityEntrepreneurText:
		"বাংলাদেশি বিজনেসের আসল সমস্যা সমাধান করে এমন কোম্পানি গড়ছেন।",
	identityArtistText:
		"সংগীত ছাড়া নাশিদ রেকর্ড করেন — শুধু কণ্ঠ, কথা ও অর্থ।",
	identityHafizText: "কুরআনের হাফিজ, আলেম হিসেবে প্রশিক্ষিত।",
	identityPublicText: "সরাসরি আর অনলাইনে কথা বলা, শেখানো আর শেয়ার করা।",
	publicFigureTitle: "পাবলিক ফিগার ও কমিউনিটি",
	publicFigureTitles: ["উদ্যোগ", "কমিউনিটি কাজ", "সবার সামনে কথা"],
	publicFigureVentures:
		"বাংলাদেশি বিজনেসের আসল সমস্যা সমাধান করে এমন কোম্পানি গড়ছেন।",
	publicFigureSocial: "ঢাকা আর আশপাশে কমিউনিটি কাজ আর পাবলিক উদ্যোগ।",
	publicFigureVoice: "সরাসরি আর অনলাইনে কথা বলা, শেখানো আর শেয়ার করা।",
	findSocial: "সোশ্যাল মিডিয়ায় তাকে খুঁজুন",
	listenNasheed: "তার নাশিদ শুনুন",
	selectedProjects: "সিলেক্টেড প্রজেক্ট",
	reachOutTitle: "মেসেজ করুন — কাজ, কোনো অনুষ্ঠান, কিংবা শুধু সালাম জানাতে।",
	reachOutSub:
		"প্রজেক্টের খোঁজখবর, বক্তব্য আর অনুষ্ঠানের দাওয়াত, আর শ্রোতাদের মেসেজ — সবই স্বাগত; তিনি নিজে পড়েন আর উত্তর দেন, সাধারণত এক দিনের মধ্যে।",
	platformsTitle: "সব প্ল্যাটফর্ম",
	platformsIntro: "প্রতিটি প্রোফাইল, এক জায়গায় — যেখানে থাকে সেই অনুযায়ী সাজানো।",
	platformsMusic: "নাশিদ ও স্ট্রিমিং",
	platformsMusicBlurb: "নাশিদ যেখানে থাকে — চ্যানেল ও শিল্পী প্রোফাইল।",
	platformsSocial: "সোশ্যাল মিডিয়া",
	platformsSocialBlurb: "প্রতিদিনের আপডেট, কমিউনিটি ও পাবলিক কাজ।",
	platformsProfessional: "প্রফেশনাল / কোড",
	platformsProfessionalBlurb: "ইঞ্জিনিয়ারিংয়ের কাজ, সবার সামনে।",
	backHome: "← হোমে ফিরুন",
	homeName: "হোম",
	allProjects: "সব প্রজেক্ট",
	allPosts: "সব পোস্ট",
	allReleases: "সব রিলিজ",
	allVentures: "সব উদ্যোগ",
	allCaseStudies: "সব কেস স্টাডি",
	allChip: "সবগুলো",
	moreFilters: "আরও",
	showingProjects: "মোট {total}টি প্রজেক্টের মধ্যে {shown}টি দেখাচ্ছে",
	showingPosts: "মোট {total}টি পোস্টের মধ্যে {shown}টি দেখাচ্ছে",
	showingReleases: "মোট {total}টি রিলিজের মধ্যে {shown}টি দেখাচ্ছে",
	showingVentures: "মোট {total}টি উদ্যোগের মধ্যে {shown}টি দেখাচ্ছে",
	emptyProjects: "এখনো কোনো প্রজেক্ট পাবলিশ হয়নি।",
	emptyPosts: "এখনো কোনো পোস্ট পাবলিশ হয়নি।",
	emptyCaseStudies: "এখনো কোনো কেস স্টাডি পাবলিশ হয়নি।",
	emptyVentures: "এখনো কোনো উদ্যোগ পাবলিশ হয়নি।",
	emptyReleases: "এখনো কোনো রিলিজ পাবলিশ হয়নি।",
	releaseTypeNasheed: "নাশিদ",
	releaseTypeTilawat: "তিলাওয়াত",
	releaseTypePodcast: "পডকাস্ট",
	releaseTypeLecture: "লেকচার",
	releaseTypeOther: "অন্যান্য",
	audioOnly: "শুধু অডিও — ইউটিউবে নেই",
	viewDetailsFor: "বিস্তারিত দেখুন",
	availableOn: "যেখানে পাওয়া যাবে",
	backAllProjects: "← সব প্রজেক্ট",
	backAllPosts: "← সব পোস্ট",
	backAllReleases: "← সব রিলিজ",
	backAllVentures: "← সব উদ্যোগ",
	backAllCaseStudies: "← সব কেস স্টাডি",
	backCaseStudy: "← কেস স্টাডিতে ফিরুন",
	aboutProject: "এই প্রজেক্ট সম্পর্কে",
	aboutRelease: "এই রিলিজ সম্পর্কে",
	aboutVenture: "সম্পর্কে",
	problem: "সমস্যাটা",
	fix: "সমাধানটা",
	result: "ফলাফল",
	research: "গবেষণায় যা দেখা গেল",
	tune: "সুর",
	lyricist: "গীতিকার",
	lyrics: "গানের কথা",
	listenWatch: "শুনুন ও দেখুন",
	videoLabel: "ভিডিও",
	audioLabel: "অডিও",
	publishedLabel: "পাবলিশড",
	clientLabel: "ক্লায়েন্ট",
	roleLabel: "ভূমিকা",
	categoryLabel: "ক্যাটাগরি",
	statusLabel: "অবস্থা",
	liveSiteLabel: "লাইভ সাইট",
	visitSite: "সাইটটা দেখুন",
	stageLabel: "স্টেজ",
	locationLabel: "অবস্থান",
	teamSizeLabel: "টিম সাইজ",
	foundedLabel: "শুরু",
	websiteLabel: "ওয়েবসাইট",
	visitWebsite: "ওয়েবসাইটটা দেখুন",
	projectLabel: "প্রজেক্ট",
	viewProject: "প্রজেক্টটা দেখুন",
	authorBy: "লেখক",
	authorLine: "সফটওয়্যার ইঞ্জিনিয়ার · উদ্যোক্তা · নাশিদ শিল্পী — ঢাকা",
	morePosts: "আরও পোস্ট",
	previous: "আগেরটা",
	next: "পরেরটা",
	previousProject: "আগের প্রজেক্ট",
	nextProject: "পরের প্রজেক্ট",
	previousClient: "আগের ক্লায়েন্ট",
	nextClient: "পরের ক্লায়েন্ট",
	loadingProjects: "প্রজেক্ট লোড হচ্ছে",
	builtWith: "যা দিয়ে বানানো",
	notFoundProject: "প্রজেক্টটা পাওয়া যায়নি",
	notFoundPost: "পোস্টটা এখনো পাবলিশ হয়নি",
	notFoundRelease: "রিলিজটা এখনো পাবলিশ হয়নি",
	notFoundVenture: "উদ্যোগটা এখনো পাবলিশ হয়নি",
	notFoundCaseStudy: "কেস স্টাডিটা পাওয়া যায়নি",
	pageNotFound: "পেজটি পাওয়া যায়নি",
	pageNotFoundText: "এই পেজটি নেই বা এখনো পাবলিশ হয়নি।",
	notPublishedProject: "এই প্রজেক্টটা এখনো পাবলিশ হয়নি।",
	notPublishedPost: "এই পোস্টটা এখনো পাবলিশ হয়নি।",
	notPublishedRelease: "এই রিলিজটা এখনো পাবলিশ হয়নি।",
	notPublishedVenture: "এই উদ্যোগটা এখনো পাবলিশ হয়নি।",
	notPublishedCaseStudy: "এই কেস স্টাডিটা এখনো পাবলিশ হয়নি।",
	wantSystemLike: "এমন একটা সিস্টেম চান",
	discussSimilarProject: "একই ধরনের প্রজেক্ট নিয়ে কথা বলুন",
	discussSimilarVenture: "একই ধরনের উদ্যোগ নিয়ে কথা বলুন",
	facingSimilar: "একই ধরনের সমস্যার মুখোমুখি?",
	caseStudyCtaText:
		"আপনার প্রজেক্ট সম্পর্কে জানান — অথবা আগে দেখে নিন এই কেস স্টাডির সিস্টেমটা।",
	ventureCtaText: "আপনার উদ্যোগ সম্পর্কে জানান — আমি নিজে উত্তর দেব।",
	projectCtaText: "কী বানাচ্ছেন, জানান — আমি এক দিনের মধ্যে উত্তর দেব।",
	thinkingVenture: "এমন কিছু বানানোর কথা ভাবছেন",
	formName: "আপনার নাম *",
	formNamePlaceholder: "আপনার পুরো নাম",
	formEmail: "ইমেইল",
	formEmailPlaceholder: "you@example.com",
	formPhone: "ফোন",
	formPhonePlaceholder: "01XXXXXXXXX",
	formService: "সার্ভিস (ঐচ্ছিক)",
	formSelectService: "একটা সার্ভিস বেছে নিন...",
	formMessage: "মেসেজ (ঐচ্ছিক)",
	formMessagePlaceholder: "আপনার কী প্রয়োজন একটু জানান...",
	formSend: "মেসেজ পাঠান",
	formSending: "পাঠানো হচ্ছে...",
	formThanks: "ধন্যবাদ — খুব তাড়াতাড়ি উত্তর দেব।",
	formReplyPersonal: "প্রতিটা মেসেজের উত্তর আমি নিজে দিই।",
	formSendAnother: "আরেকটা মেসেজ পাঠান",
	formPreferEmail: "ইমেইল পছন্দ? লিখুন —",
	formErrorName: "আপনার নামটা জানান।",
	formErrorContact:
		"আমি যেন উত্তর দিতে পারি, আপনার ইমেইল বা ফোন নম্বর দিন।",
	formErrorEmail: "ইমেইল ঠিকানাটা সঠিক মনে হচ্ছে না।",
	formErrorPhone:
		"একটা বাংলাদেশি মোবাইল নম্বর দিন — 01XXXXXXXXX অথবা +8801XXXXXXXXX।",
	formHintContact:
		"অন্তত একটা দিন — ইমেইল বা ফোন — যাতে আমি উত্তর দিতে পারি। অন্যটা ঐচ্ছিক।",
	formPreselected:
		"আপনি যা দেখছিলেন তার ভিত্তিতে আগে থেকেই বেছে নেওয়া হয়েছে — চাইলে বদলাতে পারেন।",
	modalSub: "আপনার কী প্রয়োজন জানান — আমি নিজে উত্তর দিই।",
	footerSubSe:
		"সফটওয়্যার ইঞ্জিনিয়ার · উদ্যোক্তা · ইসলামিক শিল্পী — ঢাকা, বাংলাদেশ",
	footerSubKnowMe:
		"সফটওয়্যার ইঞ্জিনিয়ার · উদ্যোক্তা · নাশিদ শিল্পী · হাফিজ-আলেম · পাবলিক ফিগার — ঢাকা, বাংলাদেশ",
	footerAllPlatforms: "সব প্ল্যাটফর্ম →",
	footerRights: "সর্বস্বত্ব সংরক্ষিত।",
	playVideo: "ভিডিও প্লে করুন",
	playHere: "এখানেই প্লে করুন",
	watchOnYouTube: "ইউটিউবে দেখুন",
	galleryLabel: "গ্যালারি",
	videosLabel: "ভিডিও",
	prevImages: "আগের ছবিগুলো",
	nextImages: "পরের ছবিগুলো",
	prevVideos: "আগের ভিডিওগুলো",
	nextVideos: "পরের ভিডিওগুলো",
	mediaCounter: "{current} / {total}",
	galleryImage: "গ্যালারি ছবি",
	audioRelease: "অডিও রিলিজ",
	ventureMetrics: "উদ্যোগের মেট্রিক",
	homeTitle: "মাহমুদুল হাসান রিয়াজ — সফটওয়্যার ইঞ্জিনিয়ার, উদ্যোক্তা ও নাশিদ শিল্পী",
	homeDescription:
		"ঢাকা, বাংলাদেশের সফটওয়্যার ইঞ্জিনিয়ার, উদ্যোক্তা ও নাশিদ শিল্পী। বাংলাদেশ আর বিশ্বের বিজনেসের জন্য ERP, ই-কমার্স আর SaaS সিস্টেম।",
	knowMeTitle: "আমাকে জানুন — মাহমুদুল হাসান রিয়াজ",
	knowMeDescription:
		"পুরো মানুষটি: সফটওয়্যার ইঞ্জিনিয়ার, উদ্যোক্তা, নাশিদ শিল্পী, হাফিজ-আলেম ও পাবলিক ফিগার।",
	platformsPageTitle: "সব প্ল্যাটফর্ম — মাহমুদুল হাসান রিয়াজ",
	platformsPageDescription:
		"মাহমুদুল হাসান রিয়াজকে যেখানে যেখানে পাওয়া যাবে — স্ট্রিমিং, সোশ্যাল মিডিয়া আর প্রফেশনাল প্রোফাইল।",
	projectsPageTitle: "সব প্রজেক্ট — মাহমুদুল হাসান রিয়াজ",
	projectsPageDescription:
		"মাহমুদুল হাসান রিয়াজের সব প্রজেক্ট — বাংলাদেশ আর বিশ্বের বিজনেসের জন্য ERP, SaaS আর ই-কমার্স সিস্টেম।",
	postsPageTitle: "সব পোস্ট — মাহমুদুল হাসান রিয়াজ",
	postsPageDescription:
		"মাহমুদুল হাসান রিয়াজের পোস্ট — ERP, ই-কমার্স, ওয়ার্ডপ্রেস আর নাশিদ।",
	releasesPageTitle: "সব রিলিজ — মাহমুদুল হাসান রিয়াজ",
	releasesPageDescription:
		"মাহমুদুল হাসান রিয়াজের নাশিদ, তিলাওয়াত, পডকাস্ট ও লেকচার রিলিজ।",
	venturesPageTitle: "সব উদ্যোগ — মাহমুদুল হাসান রিয়াজ",
	venturesPageDescription:
		"মাহমুদুল হাসান রিয়াজের উদ্যোগ — বাংলাদেশি বিজনেসের জন্য বানানো কোম্পানি।",
	caseStudiesPageTitle: "সব কেস স্টাডি — মাহমুদুল হাসান রিয়াজ",
	caseStudiesPageDescription:
		"মাহমুদুল হাসান রিয়াজের কেস স্টাডি — সিস্টেমগুলো কীভাবে বানানো হয়েছিল আর কী বদলে দিয়েছিল।",
};
