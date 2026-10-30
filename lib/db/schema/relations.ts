import { relations } from "drizzle-orm/relations";
import { users, adminChats, adminChatMessages, profiles, adminMessages, adminNotifications, appLogs, blogPosts, blogEvents, lifeCategories, budgetCategories, adminPromoCampaigns, cashappPayments, userContacts, contactAddresses, contactEmails, contactJobRoles, contractorEvents, contractorJobs, contactLocations, userBrands, contractorRateCards, contactPhones, contactShares, contactTags, contractorJobAssignments, emailCampaigns, emailSends, entityLifeCategories, equipmentCatalog, equipment, equipmentCategories, financialTransactions, financialAccounts, equipmentMedia, equipmentValuations, userFeedback, feedbackReplies, institutions, institutionOffers, invitedUsers, invoices, paychecks, invoiceItems, invoiceTemplates, invoiceTemplateItems, itemPrices, jobDocuments, jobNotes, jobReplacementRequests, jobTimeEntries, listerMessageGroups, listerMessageGroupMembers, listerMessages, messageReplies, moduleTours, notificationLog, notificationPreferences, paycheckDeposits, paycheckInvoices, paycheckTaxes, publicVenues, pushSubscriptions, scanImages, receiptLineItems, recurringPayments, referralRewardTiers, referralRewards, tourEvents, unionDocuments, unionDocumentChunks, unionMemberships, unionDuesPayments, unionRagSubmissions, usageEvents, venueChangeRequests, witusIdentities, blogLikes, blogSaves, messageReads } from "./schema";

export const adminChatsRelations = relations(adminChats, ({one, many}) => ({
	user: one(users, {
		fields: [adminChats.userId],
		references: [users.id]
	}),
	adminChatMessages: many(adminChatMessages),
}));

export const usersRelations = relations(users, ({many}) => ({
	adminChats: many(adminChats),
	profiles: many(profiles),
	adminNotifications: many(adminNotifications),
	appLogs: many(appLogs),
	blogPosts: many(blogPosts),
	lifeCategories: many(lifeCategories),
	budgetCategories: many(budgetCategories),
	cashappPayments_userId: many(cashappPayments, {
		relationName: "cashappPayments_userId_users_id"
	}),
	cashappPayments_verifiedBy: many(cashappPayments, {
		relationName: "cashappPayments_verifiedBy_users_id"
	}),
	userContacts_linkedUserId: many(userContacts, {
		relationName: "userContacts_linkedUserId_users_id"
	}),
	userContacts_userId: many(userContacts, {
		relationName: "userContacts_userId_users_id"
	}),
	contractorEvents: many(contractorEvents),
	contractorJobs_listerId: many(contractorJobs, {
		relationName: "contractorJobs_listerId_users_id"
	}),
	contractorJobs_userId: many(contractorJobs, {
		relationName: "contractorJobs_userId_users_id"
	}),
	contactShares_sharedBy: many(contactShares, {
		relationName: "contactShares_sharedBy_users_id"
	}),
	contactShares_sharedWith: many(contactShares, {
		relationName: "contactShares_sharedWith_users_id"
	}),
	contractorJobAssignments_assignedBy: many(contractorJobAssignments, {
		relationName: "contractorJobAssignments_assignedBy_users_id"
	}),
	contractorJobAssignments_assignedTo: many(contractorJobAssignments, {
		relationName: "contractorJobAssignments_assignedTo_users_id"
	}),
	userBrands: many(userBrands),
	contractorRateCards: many(contractorRateCards),
	emailCampaigns: many(emailCampaigns),
	emailSends: many(emailSends),
	entityLifeCategories: many(entityLifeCategories),
	equipment: many(equipment),
	equipmentCategories: many(equipmentCategories),
	financialTransactions: many(financialTransactions),
	equipmentMedias: many(equipmentMedia),
	equipmentValuations: many(equipmentValuations),
	userFeedbacks: many(userFeedback),
	feedbackReplies: many(feedbackReplies),
	financialAccounts: many(financialAccounts),
	invitedUsers_invitedBy: many(invitedUsers, {
		relationName: "invitedUsers_invitedBy_users_id"
	}),
	invitedUsers_userId: many(invitedUsers, {
		relationName: "invitedUsers_userId_users_id"
	}),
	invoices: many(invoices),
	invoiceTemplates: many(invoiceTemplates),
	paychecks: many(paychecks),
	itemPrices: many(itemPrices),
	jobDocuments: many(jobDocuments),
	jobNotes: many(jobNotes),
	jobReplacementRequests_posterId: many(jobReplacementRequests, {
		relationName: "jobReplacementRequests_posterId_users_id"
	}),
	jobReplacementRequests_requesterId: many(jobReplacementRequests, {
		relationName: "jobReplacementRequests_requesterId_users_id"
	}),
	jobTimeEntries: many(jobTimeEntries),
	listerMessageGroups: many(listerMessageGroups),
	listerMessageGroupMembers: many(listerMessageGroupMembers),
	listerMessages_recipientId: many(listerMessages, {
		relationName: "listerMessages_recipientId_users_id"
	}),
	listerMessages_senderId: many(listerMessages, {
		relationName: "listerMessages_senderId_users_id"
	}),
	messageReplies: many(messageReplies),
	moduleTours: many(moduleTours),
	notificationLogs: many(notificationLog),
	notificationPreferences: many(notificationPreferences),
	publicVenues: many(publicVenues),
	pushSubscriptions: many(pushSubscriptions),
	scanImages: many(scanImages),
	receiptLineItems: many(receiptLineItems),
	recurringPayments: many(recurringPayments),
	referralRewards: many(referralRewards),
	tourEvents: many(tourEvents),
	unionDocuments: many(unionDocuments),
	unionMemberships: many(unionMemberships),
	unionDuesPayments: many(unionDuesPayments),
	unionRagSubmissions: many(unionRagSubmissions),
	usageEvents: many(usageEvents),
	venueChangeRequests_reviewedBy: many(venueChangeRequests, {
		relationName: "venueChangeRequests_reviewedBy_users_id"
	}),
	venueChangeRequests_userId: many(venueChangeRequests, {
		relationName: "venueChangeRequests_userId_users_id"
	}),
	witusIdentities: many(witusIdentities),
	blogLikes: many(blogLikes),
	blogSaves: many(blogSaves),
}));

export const adminChatMessagesRelations = relations(adminChatMessages, ({one}) => ({
	adminChat: one(adminChats, {
		fields: [adminChatMessages.chatId],
		references: [adminChats.id]
	}),
}));

export const profilesRelations = relations(profiles, ({one, many}) => ({
	user: one(users, {
		fields: [profiles.id],
		references: [users.id]
	}),
	adminMessages: many(adminMessages),
	messageReads: many(messageReads),
}));

export const adminMessagesRelations = relations(adminMessages, ({one, many}) => ({
	profile: one(profiles, {
		fields: [adminMessages.recipientUserId],
		references: [profiles.id]
	}),
	messageReplies: many(messageReplies),
	messageReads: many(messageReads),
}));

export const adminNotificationsRelations = relations(adminNotifications, ({one}) => ({
	user: one(users, {
		fields: [adminNotifications.userId],
		references: [users.id]
	}),
}));

export const appLogsRelations = relations(appLogs, ({one}) => ({
	user: one(users, {
		fields: [appLogs.userId],
		references: [users.id]
	}),
}));

export const blogPostsRelations = relations(blogPosts, ({one, many}) => ({
	user: one(users, {
		fields: [blogPosts.userId],
		references: [users.id]
	}),
	blogEvents: many(blogEvents),
	blogLikes: many(blogLikes),
	blogSaves: many(blogSaves),
}));

export const blogEventsRelations = relations(blogEvents, ({one}) => ({
	blogPost: one(blogPosts, {
		fields: [blogEvents.postId],
		references: [blogPosts.id]
	}),
}));

export const lifeCategoriesRelations = relations(lifeCategories, ({one, many}) => ({
	user: one(users, {
		fields: [lifeCategories.userId],
		references: [users.id]
	}),
	budgetCategories: many(budgetCategories),
	entityLifeCategories: many(entityLifeCategories),
}));

export const budgetCategoriesRelations = relations(budgetCategories, ({one, many}) => ({
	lifeCategory: one(lifeCategories, {
		fields: [budgetCategories.lifeCategoryId],
		references: [lifeCategories.id]
	}),
	user: one(users, {
		fields: [budgetCategories.userId],
		references: [users.id]
	}),
	userContacts: many(userContacts),
	financialTransactions: many(financialTransactions),
	invoices: many(invoices),
	invoiceTemplates: many(invoiceTemplates),
	recurringPayments: many(recurringPayments),
}));

export const cashappPaymentsRelations = relations(cashappPayments, ({one}) => ({
	adminPromoCampaign: one(adminPromoCampaigns, {
		fields: [cashappPayments.promoCampaignId],
		references: [adminPromoCampaigns.id]
	}),
	user_userId: one(users, {
		fields: [cashappPayments.userId],
		references: [users.id],
		relationName: "cashappPayments_userId_users_id"
	}),
	user_verifiedBy: one(users, {
		fields: [cashappPayments.verifiedBy],
		references: [users.id],
		relationName: "cashappPayments_verifiedBy_users_id"
	}),
}));

export const adminPromoCampaignsRelations = relations(adminPromoCampaigns, ({many}) => ({
	cashappPayments: many(cashappPayments),
}));

export const userContactsRelations = relations(userContacts, ({one, many}) => ({
	budgetCategory: one(budgetCategories, {
		fields: [userContacts.defaultCategoryId],
		references: [budgetCategories.id]
	}),
	user_linkedUserId: one(users, {
		fields: [userContacts.linkedUserId],
		references: [users.id],
		relationName: "userContacts_linkedUserId_users_id"
	}),
	user_userId: one(users, {
		fields: [userContacts.userId],
		references: [users.id],
		relationName: "userContacts_userId_users_id"
	}),
	contactAddresses: many(contactAddresses),
	contactEmails: many(contactEmails),
	contactJobRoles: many(contactJobRoles),
	contractorEvents_clientId: many(contractorEvents, {
		relationName: "contractorEvents_clientId_userContacts_id"
	}),
	contractorEvents_crewCoordinatorId: many(contractorEvents, {
		relationName: "contractorEvents_crewCoordinatorId_userContacts_id"
	}),
	contractorEvents_pocContactId: many(contractorEvents, {
		relationName: "contractorEvents_pocContactId_userContacts_id"
	}),
	contractorJobs_clientId: many(contractorJobs, {
		relationName: "contractorJobs_clientId_userContacts_id"
	}),
	contractorJobs_crewCoordinatorId: many(contractorJobs, {
		relationName: "contractorJobs_crewCoordinatorId_userContacts_id"
	}),
	contractorJobs_pocContactId: many(contractorJobs, {
		relationName: "contractorJobs_pocContactId_userContacts_id"
	}),
	contactLocations: many(contactLocations),
	contactPhones: many(contactPhones),
	contactShares: many(contactShares),
	contactTags: many(contactTags),
	invoices: many(invoices),
	invoiceTemplates: many(invoiceTemplates),
	itemPrices: many(itemPrices),
	scanImages: many(scanImages),
}));

export const contactAddressesRelations = relations(contactAddresses, ({one}) => ({
	userContact: one(userContacts, {
		fields: [contactAddresses.contactId],
		references: [userContacts.id]
	}),
}));

export const contactEmailsRelations = relations(contactEmails, ({one}) => ({
	userContact: one(userContacts, {
		fields: [contactEmails.contactId],
		references: [userContacts.id]
	}),
}));

export const contactJobRolesRelations = relations(contactJobRoles, ({one}) => ({
	userContact: one(userContacts, {
		fields: [contactJobRoles.contactId],
		references: [userContacts.id]
	}),
	contractorEvent: one(contractorEvents, {
		fields: [contactJobRoles.eventId],
		references: [contractorEvents.id]
	}),
	contractorJob: one(contractorJobs, {
		fields: [contactJobRoles.jobId],
		references: [contractorJobs.id]
	}),
}));

export const contractorEventsRelations = relations(contractorEvents, ({one, many}) => ({
	contactJobRoles: many(contactJobRoles),
	userContact_clientId: one(userContacts, {
		fields: [contractorEvents.clientId],
		references: [userContacts.id],
		relationName: "contractorEvents_clientId_userContacts_id"
	}),
	userContact_crewCoordinatorId: one(userContacts, {
		fields: [contractorEvents.crewCoordinatorId],
		references: [userContacts.id],
		relationName: "contractorEvents_crewCoordinatorId_userContacts_id"
	}),
	contactLocation: one(contactLocations, {
		fields: [contractorEvents.locationId],
		references: [contactLocations.id]
	}),
	userContact_pocContactId: one(userContacts, {
		fields: [contractorEvents.pocContactId],
		references: [userContacts.id],
		relationName: "contractorEvents_pocContactId_userContacts_id"
	}),
	user: one(users, {
		fields: [contractorEvents.userId],
		references: [users.id]
	}),
	contractorJobs: many(contractorJobs),
}));

export const contractorJobsRelations = relations(contractorJobs, ({one, many}) => ({
	contactJobRoles: many(contactJobRoles),
	userBrand: one(userBrands, {
		fields: [contractorJobs.brandId],
		references: [userBrands.id]
	}),
	userContact_clientId: one(userContacts, {
		fields: [contractorJobs.clientId],
		references: [userContacts.id],
		relationName: "contractorJobs_clientId_userContacts_id"
	}),
	userContact_crewCoordinatorId: one(userContacts, {
		fields: [contractorJobs.crewCoordinatorId],
		references: [userContacts.id],
		relationName: "contractorJobs_crewCoordinatorId_userContacts_id"
	}),
	contractorEvent: one(contractorEvents, {
		fields: [contractorJobs.eventId],
		references: [contractorEvents.id]
	}),
	user_listerId: one(users, {
		fields: [contractorJobs.listerId],
		references: [users.id],
		relationName: "contractorJobs_listerId_users_id"
	}),
	contactLocation: one(contactLocations, {
		fields: [contractorJobs.locationId],
		references: [contactLocations.id]
	}),
	userContact_pocContactId: one(userContacts, {
		fields: [contractorJobs.pocContactId],
		references: [userContacts.id],
		relationName: "contractorJobs_pocContactId_userContacts_id"
	}),
	contractorRateCard: one(contractorRateCards, {
		fields: [contractorJobs.rateCardId],
		references: [contractorRateCards.id]
	}),
	user_userId: one(users, {
		fields: [contractorJobs.userId],
		references: [users.id],
		relationName: "contractorJobs_userId_users_id"
	}),
	contractorJobAssignments: many(contractorJobAssignments),
	financialTransactions: many(financialTransactions),
	invoices: many(invoices),
	paychecks: many(paychecks),
	jobDocuments: many(jobDocuments),
	jobNotes: many(jobNotes),
	jobReplacementRequests: many(jobReplacementRequests),
	jobTimeEntries: many(jobTimeEntries),
}));

export const contactLocationsRelations = relations(contactLocations, ({one, many}) => ({
	contractorEvents: many(contractorEvents),
	contractorJobs: many(contractorJobs),
	userContact: one(userContacts, {
		fields: [contactLocations.contactId],
		references: [userContacts.id]
	}),
}));

export const userBrandsRelations = relations(userBrands, ({one, many}) => ({
	contractorJobs: many(contractorJobs),
	user: one(users, {
		fields: [userBrands.userId],
		references: [users.id]
	}),
	financialTransactions: many(financialTransactions),
	invoices: many(invoices),
	invoiceTemplates: many(invoiceTemplates),
}));

export const contractorRateCardsRelations = relations(contractorRateCards, ({one, many}) => ({
	contractorJobs: many(contractorJobs),
	user: one(users, {
		fields: [contractorRateCards.userId],
		references: [users.id]
	}),
}));

export const contactPhonesRelations = relations(contactPhones, ({one}) => ({
	userContact: one(userContacts, {
		fields: [contactPhones.contactId],
		references: [userContacts.id]
	}),
}));

export const contactSharesRelations = relations(contactShares, ({one}) => ({
	userContact: one(userContacts, {
		fields: [contactShares.contactId],
		references: [userContacts.id]
	}),
	user_sharedBy: one(users, {
		fields: [contactShares.sharedBy],
		references: [users.id],
		relationName: "contactShares_sharedBy_users_id"
	}),
	user_sharedWith: one(users, {
		fields: [contactShares.sharedWith],
		references: [users.id],
		relationName: "contactShares_sharedWith_users_id"
	}),
}));

export const contactTagsRelations = relations(contactTags, ({one}) => ({
	userContact: one(userContacts, {
		fields: [contactTags.contactId],
		references: [userContacts.id]
	}),
}));

export const contractorJobAssignmentsRelations = relations(contractorJobAssignments, ({one}) => ({
	user_assignedBy: one(users, {
		fields: [contractorJobAssignments.assignedBy],
		references: [users.id],
		relationName: "contractorJobAssignments_assignedBy_users_id"
	}),
	user_assignedTo: one(users, {
		fields: [contractorJobAssignments.assignedTo],
		references: [users.id],
		relationName: "contractorJobAssignments_assignedTo_users_id"
	}),
	contractorJob: one(contractorJobs, {
		fields: [contractorJobAssignments.jobId],
		references: [contractorJobs.id]
	}),
}));

export const emailCampaignsRelations = relations(emailCampaigns, ({one, many}) => ({
	user: one(users, {
		fields: [emailCampaigns.createdBy],
		references: [users.id]
	}),
	emailSends: many(emailSends),
}));

export const emailSendsRelations = relations(emailSends, ({one}) => ({
	emailCampaign: one(emailCampaigns, {
		fields: [emailSends.campaignId],
		references: [emailCampaigns.id]
	}),
	user: one(users, {
		fields: [emailSends.userId],
		references: [users.id]
	}),
}));

export const entityLifeCategoriesRelations = relations(entityLifeCategories, ({one}) => ({
	lifeCategory: one(lifeCategories, {
		fields: [entityLifeCategories.lifeCategoryId],
		references: [lifeCategories.id]
	}),
	user: one(users, {
		fields: [entityLifeCategories.userId],
		references: [users.id]
	}),
}));

export const equipmentRelations = relations(equipment, ({one, many}) => ({
	equipmentCatalog: one(equipmentCatalog, {
		fields: [equipment.catalogId],
		references: [equipmentCatalog.id]
	}),
	equipmentCategory: one(equipmentCategories, {
		fields: [equipment.categoryId],
		references: [equipmentCategories.id]
	}),
	financialTransaction: one(financialTransactions, {
		fields: [equipment.transactionId],
		references: [financialTransactions.id]
	}),
	user: one(users, {
		fields: [equipment.userId],
		references: [users.id]
	}),
	equipmentMedias: many(equipmentMedia),
	equipmentValuations: many(equipmentValuations),
}));

export const equipmentCatalogRelations = relations(equipmentCatalog, ({many}) => ({
	equipment: many(equipment),
}));

export const equipmentCategoriesRelations = relations(equipmentCategories, ({one, many}) => ({
	equipment: many(equipment),
	user: one(users, {
		fields: [equipmentCategories.userId],
		references: [users.id]
	}),
}));

export const financialTransactionsRelations = relations(financialTransactions, ({one, many}) => ({
	equipment: many(equipment),
	financialAccount: one(financialAccounts, {
		fields: [financialTransactions.accountId],
		references: [financialAccounts.id]
	}),
	userBrand: one(userBrands, {
		fields: [financialTransactions.brandId],
		references: [userBrands.id]
	}),
	budgetCategory: one(budgetCategories, {
		fields: [financialTransactions.categoryId],
		references: [budgetCategories.id]
	}),
	contractorJob: one(contractorJobs, {
		fields: [financialTransactions.jobId],
		references: [contractorJobs.id]
	}),
	user: one(users, {
		fields: [financialTransactions.userId],
		references: [users.id]
	}),
	invoices: many(invoices),
	paycheckDeposits: many(paycheckDeposits),
	receiptLineItems: many(receiptLineItems),
	unionDuesPayments: many(unionDuesPayments),
}));

export const financialAccountsRelations = relations(financialAccounts, ({one, many}) => ({
	financialTransactions: many(financialTransactions),
	user: one(users, {
		fields: [financialAccounts.userId],
		references: [users.id]
	}),
	invoices: many(invoices),
	invoiceTemplates: many(invoiceTemplates),
	paycheckDeposits: many(paycheckDeposits),
	recurringPayments: many(recurringPayments),
}));

export const equipmentMediaRelations = relations(equipmentMedia, ({one}) => ({
	equipment: one(equipment, {
		fields: [equipmentMedia.equipmentId],
		references: [equipment.id]
	}),
	user: one(users, {
		fields: [equipmentMedia.userId],
		references: [users.id]
	}),
}));

export const equipmentValuationsRelations = relations(equipmentValuations, ({one}) => ({
	equipment: one(equipment, {
		fields: [equipmentValuations.equipmentId],
		references: [equipment.id]
	}),
	user: one(users, {
		fields: [equipmentValuations.userId],
		references: [users.id]
	}),
}));

export const userFeedbackRelations = relations(userFeedback, ({one, many}) => ({
	user: one(users, {
		fields: [userFeedback.userId],
		references: [users.id]
	}),
	feedbackReplies: many(feedbackReplies),
}));

export const feedbackRepliesRelations = relations(feedbackReplies, ({one}) => ({
	userFeedback: one(userFeedback, {
		fields: [feedbackReplies.feedbackId],
		references: [userFeedback.id]
	}),
	user: one(users, {
		fields: [feedbackReplies.senderId],
		references: [users.id]
	}),
}));

export const institutionOffersRelations = relations(institutionOffers, ({one}) => ({
	institution: one(institutions, {
		fields: [institutionOffers.institutionId],
		references: [institutions.id]
	}),
}));

export const institutionsRelations = relations(institutions, ({many}) => ({
	institutionOffers: many(institutionOffers),
}));

export const invitedUsersRelations = relations(invitedUsers, ({one}) => ({
	user_invitedBy: one(users, {
		fields: [invitedUsers.invitedBy],
		references: [users.id],
		relationName: "invitedUsers_invitedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [invitedUsers.userId],
		references: [users.id],
		relationName: "invitedUsers_userId_users_id"
	}),
}));

export const invoicesRelations = relations(invoices, ({one, many}) => ({
	financialAccount: one(financialAccounts, {
		fields: [invoices.accountId],
		references: [financialAccounts.id]
	}),
	userBrand: one(userBrands, {
		fields: [invoices.brandId],
		references: [userBrands.id]
	}),
	budgetCategory: one(budgetCategories, {
		fields: [invoices.categoryId],
		references: [budgetCategories.id]
	}),
	userContact: one(userContacts, {
		fields: [invoices.contactId],
		references: [userContacts.id]
	}),
	contractorJob: one(contractorJobs, {
		fields: [invoices.jobId],
		references: [contractorJobs.id]
	}),
	paycheck: one(paychecks, {
		fields: [invoices.paycheckId],
		references: [paychecks.id]
	}),
	financialTransaction: one(financialTransactions, {
		fields: [invoices.transactionId],
		references: [financialTransactions.id]
	}),
	user: one(users, {
		fields: [invoices.userId],
		references: [users.id]
	}),
	invoiceItems: many(invoiceItems),
	jobTimeEntries: many(jobTimeEntries),
	paycheckInvoices: many(paycheckInvoices),
}));

export const paychecksRelations = relations(paychecks, ({one, many}) => ({
	invoices: many(invoices),
	contractorJob: one(contractorJobs, {
		fields: [paychecks.jobId],
		references: [contractorJobs.id]
	}),
	user: one(users, {
		fields: [paychecks.userId],
		references: [users.id]
	}),
	paycheckDeposits: many(paycheckDeposits),
	paycheckInvoices: many(paycheckInvoices),
	paycheckTaxes: many(paycheckTaxes),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({one}) => ({
	invoice: one(invoices, {
		fields: [invoiceItems.invoiceId],
		references: [invoices.id]
	}),
}));

export const invoiceTemplatesRelations = relations(invoiceTemplates, ({one, many}) => ({
	financialAccount: one(financialAccounts, {
		fields: [invoiceTemplates.accountId],
		references: [financialAccounts.id]
	}),
	userBrand: one(userBrands, {
		fields: [invoiceTemplates.brandId],
		references: [userBrands.id]
	}),
	budgetCategory: one(budgetCategories, {
		fields: [invoiceTemplates.categoryId],
		references: [budgetCategories.id]
	}),
	userContact: one(userContacts, {
		fields: [invoiceTemplates.contactId],
		references: [userContacts.id]
	}),
	user: one(users, {
		fields: [invoiceTemplates.userId],
		references: [users.id]
	}),
	invoiceTemplateItems: many(invoiceTemplateItems),
}));

export const invoiceTemplateItemsRelations = relations(invoiceTemplateItems, ({one}) => ({
	invoiceTemplate: one(invoiceTemplates, {
		fields: [invoiceTemplateItems.templateId],
		references: [invoiceTemplates.id]
	}),
}));

export const itemPricesRelations = relations(itemPrices, ({one}) => ({
	user: one(users, {
		fields: [itemPrices.userId],
		references: [users.id]
	}),
	userContact: one(userContacts, {
		fields: [itemPrices.vendorContactId],
		references: [userContacts.id]
	}),
}));

export const jobDocumentsRelations = relations(jobDocuments, ({one}) => ({
	contractorJob: one(contractorJobs, {
		fields: [jobDocuments.jobId],
		references: [contractorJobs.id]
	}),
	user: one(users, {
		fields: [jobDocuments.userId],
		references: [users.id]
	}),
}));

export const jobNotesRelations = relations(jobNotes, ({one}) => ({
	contractorJob: one(contractorJobs, {
		fields: [jobNotes.jobId],
		references: [contractorJobs.id]
	}),
	user: one(users, {
		fields: [jobNotes.userId],
		references: [users.id]
	}),
}));

export const jobReplacementRequestsRelations = relations(jobReplacementRequests, ({one}) => ({
	contractorJob: one(contractorJobs, {
		fields: [jobReplacementRequests.jobId],
		references: [contractorJobs.id]
	}),
	user_posterId: one(users, {
		fields: [jobReplacementRequests.posterId],
		references: [users.id],
		relationName: "jobReplacementRequests_posterId_users_id"
	}),
	user_requesterId: one(users, {
		fields: [jobReplacementRequests.requesterId],
		references: [users.id],
		relationName: "jobReplacementRequests_requesterId_users_id"
	}),
}));

export const jobTimeEntriesRelations = relations(jobTimeEntries, ({one}) => ({
	invoice: one(invoices, {
		fields: [jobTimeEntries.invoiceId],
		references: [invoices.id]
	}),
	contractorJob: one(contractorJobs, {
		fields: [jobTimeEntries.jobId],
		references: [contractorJobs.id]
	}),
	user: one(users, {
		fields: [jobTimeEntries.userId],
		references: [users.id]
	}),
}));

export const listerMessageGroupsRelations = relations(listerMessageGroups, ({one, many}) => ({
	user: one(users, {
		fields: [listerMessageGroups.listerId],
		references: [users.id]
	}),
	listerMessageGroupMembers: many(listerMessageGroupMembers),
	listerMessages: many(listerMessages),
}));

export const listerMessageGroupMembersRelations = relations(listerMessageGroupMembers, ({one}) => ({
	listerMessageGroup: one(listerMessageGroups, {
		fields: [listerMessageGroupMembers.groupId],
		references: [listerMessageGroups.id]
	}),
	user: one(users, {
		fields: [listerMessageGroupMembers.userId],
		references: [users.id]
	}),
}));

export const listerMessagesRelations = relations(listerMessages, ({one}) => ({
	listerMessageGroup: one(listerMessageGroups, {
		fields: [listerMessages.groupId],
		references: [listerMessageGroups.id]
	}),
	user_recipientId: one(users, {
		fields: [listerMessages.recipientId],
		references: [users.id],
		relationName: "listerMessages_recipientId_users_id"
	}),
	user_senderId: one(users, {
		fields: [listerMessages.senderId],
		references: [users.id],
		relationName: "listerMessages_senderId_users_id"
	}),
}));

export const messageRepliesRelations = relations(messageReplies, ({one}) => ({
	adminMessage: one(adminMessages, {
		fields: [messageReplies.messageId],
		references: [adminMessages.id]
	}),
	user: one(users, {
		fields: [messageReplies.senderId],
		references: [users.id]
	}),
}));

export const moduleToursRelations = relations(moduleTours, ({one}) => ({
	user: one(users, {
		fields: [moduleTours.userId],
		references: [users.id]
	}),
}));

export const notificationLogRelations = relations(notificationLog, ({one}) => ({
	user: one(users, {
		fields: [notificationLog.userId],
		references: [users.id]
	}),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({one}) => ({
	user: one(users, {
		fields: [notificationPreferences.userId],
		references: [users.id]
	}),
}));

export const paycheckDepositsRelations = relations(paycheckDeposits, ({one}) => ({
	financialAccount: one(financialAccounts, {
		fields: [paycheckDeposits.accountId],
		references: [financialAccounts.id]
	}),
	paycheck: one(paychecks, {
		fields: [paycheckDeposits.paycheckId],
		references: [paychecks.id]
	}),
	financialTransaction: one(financialTransactions, {
		fields: [paycheckDeposits.transactionId],
		references: [financialTransactions.id]
	}),
}));

export const paycheckInvoicesRelations = relations(paycheckInvoices, ({one}) => ({
	invoice: one(invoices, {
		fields: [paycheckInvoices.invoiceId],
		references: [invoices.id]
	}),
	paycheck: one(paychecks, {
		fields: [paycheckInvoices.paycheckId],
		references: [paychecks.id]
	}),
}));

export const paycheckTaxesRelations = relations(paycheckTaxes, ({one}) => ({
	paycheck: one(paychecks, {
		fields: [paycheckTaxes.paycheckId],
		references: [paychecks.id]
	}),
}));

export const publicVenuesRelations = relations(publicVenues, ({one, many}) => ({
	user: one(users, {
		fields: [publicVenues.createdBy],
		references: [users.id]
	}),
	venueChangeRequests: many(venueChangeRequests),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({one}) => ({
	user: one(users, {
		fields: [pushSubscriptions.userId],
		references: [users.id]
	}),
}));

export const scanImagesRelations = relations(scanImages, ({one, many}) => ({
	userContact: one(userContacts, {
		fields: [scanImages.contactId],
		references: [userContacts.id]
	}),
	user: one(users, {
		fields: [scanImages.userId],
		references: [users.id]
	}),
	receiptLineItems: many(receiptLineItems),
}));

export const receiptLineItemsRelations = relations(receiptLineItems, ({one}) => ({
	scanImage: one(scanImages, {
		fields: [receiptLineItems.scanImageId],
		references: [scanImages.id]
	}),
	financialTransaction: one(financialTransactions, {
		fields: [receiptLineItems.transactionId],
		references: [financialTransactions.id]
	}),
	user: one(users, {
		fields: [receiptLineItems.userId],
		references: [users.id]
	}),
}));

export const recurringPaymentsRelations = relations(recurringPayments, ({one}) => ({
	financialAccount: one(financialAccounts, {
		fields: [recurringPayments.accountId],
		references: [financialAccounts.id]
	}),
	budgetCategory: one(budgetCategories, {
		fields: [recurringPayments.categoryId],
		references: [budgetCategories.id]
	}),
	user: one(users, {
		fields: [recurringPayments.userId],
		references: [users.id]
	}),
}));

export const referralRewardsRelations = relations(referralRewards, ({one}) => ({
	referralRewardTier: one(referralRewardTiers, {
		fields: [referralRewards.tierId],
		references: [referralRewardTiers.id]
	}),
	user: one(users, {
		fields: [referralRewards.userId],
		references: [users.id]
	}),
}));

export const referralRewardTiersRelations = relations(referralRewardTiers, ({many}) => ({
	referralRewards: many(referralRewards),
}));

export const tourEventsRelations = relations(tourEvents, ({one}) => ({
	user: one(users, {
		fields: [tourEvents.userId],
		references: [users.id]
	}),
}));

export const unionDocumentsRelations = relations(unionDocuments, ({one, many}) => ({
	user: one(users, {
		fields: [unionDocuments.userId],
		references: [users.id]
	}),
	unionDocumentChunks: many(unionDocumentChunks),
	unionRagSubmissions_documentId: many(unionRagSubmissions, {
		relationName: "unionRagSubmissions_documentId_unionDocuments_id"
	}),
	unionRagSubmissions_replacesDocumentId: many(unionRagSubmissions, {
		relationName: "unionRagSubmissions_replacesDocumentId_unionDocuments_id"
	}),
}));

export const unionDocumentChunksRelations = relations(unionDocumentChunks, ({one}) => ({
	unionDocument: one(unionDocuments, {
		fields: [unionDocumentChunks.documentId],
		references: [unionDocuments.id]
	}),
}));

export const unionMembershipsRelations = relations(unionMemberships, ({one, many}) => ({
	user: one(users, {
		fields: [unionMemberships.userId],
		references: [users.id]
	}),
	unionDuesPayments: many(unionDuesPayments),
}));

export const unionDuesPaymentsRelations = relations(unionDuesPayments, ({one}) => ({
	unionMembership: one(unionMemberships, {
		fields: [unionDuesPayments.membershipId],
		references: [unionMemberships.id]
	}),
	financialTransaction: one(financialTransactions, {
		fields: [unionDuesPayments.transactionId],
		references: [financialTransactions.id]
	}),
	user: one(users, {
		fields: [unionDuesPayments.userId],
		references: [users.id]
	}),
}));

export const unionRagSubmissionsRelations = relations(unionRagSubmissions, ({one}) => ({
	unionDocument_documentId: one(unionDocuments, {
		fields: [unionRagSubmissions.documentId],
		references: [unionDocuments.id],
		relationName: "unionRagSubmissions_documentId_unionDocuments_id"
	}),
	unionDocument_replacesDocumentId: one(unionDocuments, {
		fields: [unionRagSubmissions.replacesDocumentId],
		references: [unionDocuments.id],
		relationName: "unionRagSubmissions_replacesDocumentId_unionDocuments_id"
	}),
	user: one(users, {
		fields: [unionRagSubmissions.userId],
		references: [users.id]
	}),
}));

export const usageEventsRelations = relations(usageEvents, ({one}) => ({
	user: one(users, {
		fields: [usageEvents.userId],
		references: [users.id]
	}),
}));

export const venueChangeRequestsRelations = relations(venueChangeRequests, ({one}) => ({
	user_reviewedBy: one(users, {
		fields: [venueChangeRequests.reviewedBy],
		references: [users.id],
		relationName: "venueChangeRequests_reviewedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [venueChangeRequests.userId],
		references: [users.id],
		relationName: "venueChangeRequests_userId_users_id"
	}),
	publicVenue: one(publicVenues, {
		fields: [venueChangeRequests.venueId],
		references: [publicVenues.id]
	}),
}));

export const witusIdentitiesRelations = relations(witusIdentities, ({one}) => ({
	user: one(users, {
		fields: [witusIdentities.userId],
		references: [users.id]
	}),
}));

export const blogLikesRelations = relations(blogLikes, ({one}) => ({
	blogPost: one(blogPosts, {
		fields: [blogLikes.postId],
		references: [blogPosts.id]
	}),
	user: one(users, {
		fields: [blogLikes.userId],
		references: [users.id]
	}),
}));

export const blogSavesRelations = relations(blogSaves, ({one}) => ({
	blogPost: one(blogPosts, {
		fields: [blogSaves.postId],
		references: [blogPosts.id]
	}),
	user: one(users, {
		fields: [blogSaves.userId],
		references: [users.id]
	}),
}));

export const messageReadsRelations = relations(messageReads, ({one}) => ({
	adminMessage: one(adminMessages, {
		fields: [messageReads.messageId],
		references: [adminMessages.id]
	}),
	profile: one(profiles, {
		fields: [messageReads.userId],
		references: [profiles.id]
	}),
}));