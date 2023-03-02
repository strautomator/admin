// Strautomator Functions: Strava

import core = require("strautomator-core")
import logger = require("anyhow")
import dayjs from "dayjs"
const settings = require("setmeup").settings

/**
 * Refresh expired Strava access tokens.
 */
export const refreshTokens = async () => {
    logger.info("F.Strava.refreshTokens.start")

    try {
        const users = await core.users.getExpired()
        let counter = 0

        for (let user of users) {
            try {
                await core.strava.refreshToken(user.stravaTokens.refreshToken, user.stravaTokens.accessToken)
                counter++
            } catch (ex) {
                logger.error("F.Strava.refreshTokens", `Can't refresh tokens for user ${user.id} ${user.displayName}`)
            }
        }

        logger.info("F.Strava.refreshTokens", `Total ${users.length} users, ${counter} refreshed tokens`)
    } catch (ex) {
        logger.error("F.Strava.refreshTokens", ex)
    }
}

/**
 * Make sure webhook is registered on Strava.
 */
export const setupWebhook = async () => {
    logger.info("F.Strava.setupWebhook.start")

    try {
        const current = await core.strava.webhooks.getWebhook()

        if (!current) {
            await core.strava.webhooks.createWebhook()
            logger.info("F.Strava.setupWebhook", `ID ${core.strava.webhooks.current.id}`)
        }
    } catch (ex) {
        logger.error("F.Strava.setupWebhook", ex)
    }
}

/**
 * Remove expired cached Strava responses.
 */
export const cleanupCache = async () => {
    logger.info("F.Strava.cleanupCache.start")

    try {
        logger.info("F.Strava.cleanupCache")
    } catch (ex) {
        logger.error("F.Strava.cleanupCache", ex)
    }
}

/**
 * Remove dangling / expired activities from the processing queue.
 */
export const cleanupQueuedActivities = async () => {
    logger.info("F.Strava.cleanupQueuedActivities.start")

    try {
        const beforeDate = dayjs().subtract(settings.strava.maxQueueAge, "seconds").toDate()
        const activities = await core.strava.activityProcessing.getQueuedActivities(beforeDate)

        for (let activity of activities) {
            await core.strava.activityProcessing.deleteQueuedActivity(activity)
        }

        logger.info("F.Strava.cleanupQueuedActivities", `Removed ${activities.length || "no"} activities`)
    } catch (ex) {
        logger.error("F.Strava.cleanupQueuedActivities", ex)
    }
}

/**
 * Remove old processed activities from the database.
 */
export const cleanupOldActivities = async (): Promise<void> => {
    logger.info("F.Strava.cleanupOldActivities.start")

    try {
        const count = await core.strava.activityProcessing.deleteProcessedActivities(null, settings.strava.processedActivities.maxAgeDays)
        const stats = await core.database.appState.get("stats")

        const expiredTotal = (stats.activities.expired || 0) + count
        await core.database.appState.set("stats", {activities: {expired: expiredTotal}})

        logger.info("F.Strava.cleanupOldActivities", `Removed ${count || "no"} activities now`, `New expired total: ${expiredTotal}`)
    } catch (ex) {
        logger.error("F.Strava.cleanupOldActivities", ex)
    }
}

/**
 * Count how many activities were processed. Please note that activities are deleted after
 * some years, and these will be counted at deletion-time in the expired field (see above).
 */
export const countActivities = async () => {
    logger.info("F.Counters.countActivities")

    try {
        const total = await core.database.count("activities")
        const withLinkback = await core.database.count("activities", ["linkback", "==", true])

        await core.database.appState.set("stats", {activities: {total: total, withLinkback: withLinkback}})
        logger.info("F.Counters.countActivities", `Total: ${total}`, `With linkback: ${withLinkback}`)
    } catch (ex) {
        logger.error("F.Counters.countActivities", ex)
    }
}
