import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface NotificationData {
  type: string
  title: string
  message: string
  data?: any
}

export async function createNotification(
  userId: string, 
  notification: NotificationData
) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

export async function createInvitationNotification(
  invitedUserId: string,
  folderName: string,
  ownerEmail: string,
  invitationId: string,
  folderId: string,
  permissionLevel: string = 'read'
) {
  return createNotification(invitedUserId, {
    type: 'invitation_created',
    title: 'New Folder Invitation',
    message: `${ownerEmail} invited you to access the "${folderName}" folder`,
    data: {
      invitationId,
      folderId,
      folderName,
      ownerEmail,
      permissionLevel
    }
  })
}

export async function createInvitationAcceptedNotification(
  ownerUserId: string,
  userEmail: string,
  folderName: string,
  invitationId: string,
  folderId: string
) {
  return createNotification(ownerUserId, {
    type: 'invitation_accepted',
    title: 'Invitation Accepted',
    message: `${userEmail} accepted your invitation to the "${folderName}" folder`,
    data: {
      invitationId,
      folderId,
      folderName,
      userEmail
    }
  })
}

export async function createInvitationDeclinedNotification(
  ownerUserId: string,
  userEmail: string,
  folderName: string,
  invitationId: string,
  folderId: string
) {
  return createNotification(ownerUserId, {
    type: 'invitation_declined',
    title: 'Invitation Declined',
    message: `${userEmail} declined your invitation to the "${folderName}" folder`,
    data: {
      invitationId,
      folderId,
      folderName,
      userEmail
    }
  })
}

export async function createAccessRevokedNotification(
  userId: string,
  folderName: string,
  ownerEmail: string,
  folderId: string
) {
  return createNotification(userId, {
    type: 'access_revoked',
    title: 'Folder Access Revoked',
    message: `Your access to the "${folderName}" folder has been revoked by ${ownerEmail}`,
    data: {
      folderId,
      folderName,
      ownerEmail
    }
  })
}

export async function createInvitationCancelledNotification(
  invitedUserId: string,
  folderName: string,
  ownerEmail: string,
  invitationId: string,
  folderId: string
) {
  return createNotification(invitedUserId, {
    type: 'invitation_cancelled',
    title: 'Invitation Cancelled',
    message: `Your invitation to the "${folderName}" folder has been cancelled by ${ownerEmail}`,
    data: {
      invitationId,
      folderId,
      folderName,
      ownerEmail
    }
  })
}

export async function createSubscriptionNotification(
  userId: string,
  plan: string,
  action: 'upgraded' | 'downgraded' | 'expiring' | 'expired'
) {
  const planNames = {
    'FREE': 'Free',
    'PLUS': 'Plus',
    'PRO': 'Pro'
  }

  const planName = planNames[plan as keyof typeof planNames] || plan

  let title: string
  let message: string
  let type: string

  switch (action) {
    case 'upgraded':
      title = 'Subscription Upgraded! '
      message = `Congratulations! You've successfully upgraded to the ${planName} plan. Enjoy your new features!`
      type = 'subscription_upgraded'
      break
    case 'downgraded':
      title = 'Subscription Downgraded'
      message = `Your subscription has been downgraded to the ${planName} plan. Some features may no longer be available.`
      type = 'subscription_downgraded'
      break
    case 'expiring':
      title = 'Subscription Expiring Soon!'
      message = `Your ${planName} subscription will expire in 3 days. Renew now to keep your premium features!`
      type = 'subscription_expiring'
      break
    case 'expired':
      title = 'Subscription Expired'
      message = `Your ${planName} subscription has expired. You've been moved to the Free plan. Upgrade to restore premium features.`
      type = 'subscription_expired'
      break
    default:
      title = 'Subscription Update'
      message = `Your subscription has been updated to the ${planName} plan.`
      type = 'subscription_updated'
  }

  return createNotification(userId, {
    type,
    title,
    message,
    data: {
      plan,
      planName,
      action
    }
  })
}
