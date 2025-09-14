// Simple email service for sending folder sharing invitations
// In production, you would integrate with a service like SendGrid, Resend, or similar

export interface InvitationEmailData {
  to: string
  from: string
  folderName: string
  permissionLevel: string
  invitationToken: string
  expiresAt: string
}

export async function sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
  try {
    // For now, just log the email data
    // In production, you would send actual emails here
    console.log('Sending invitation email:', {
      to: data.to,
      from: data.from,
      folderName: data.folderName,
      permissionLevel: data.permissionLevel,
      invitationToken: data.invitationToken,
      expiresAt: data.expiresAt
    })

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000))

    return true
  } catch (error) {
    console.error('Error sending invitation email:', error)
    return false
  }
}

export function generateInvitationEmailTemplate(data: InvitationEmailData): string {
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invitation?token=${data.invitationToken}`
  const declineUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/decline-invitation?token=${data.invitationToken}`
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Folder Sharing Invitation - DigiVault</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .button.decline { background: #dc2626; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 DigiVault Folder Sharing Invitation</h1>
        </div>
        <div class="content">
          <h2>You've been invited to access a shared folder!</h2>
          
          <p><strong>${data.from}</strong> has invited you to access the folder <strong>"${data.folderName}"</strong> on DigiVault.</p>
          
          <p><strong>Permission Level:</strong> ${data.permissionLevel === 'read' ? 'Read Only' : 'Read & Write'}</p>
          
          <p>This invitation will expire on <strong>${new Date(data.expiresAt).toLocaleDateString()}</strong>.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${acceptUrl}" class="button">Accept Invitation</a>
            <a href="${declineUrl}" class="button decline">Decline</a>
          </div>
          
          <p><strong>What happens next?</strong></p>
          <ul>
            <li>If you accept, you'll be able to view and ${data.permissionLevel === 'read' ? 'view' : 'edit'} credentials in this folder</li>
            <li>You can access the shared folder from your DigiVault dashboard</li>
            <li>The folder owner can revoke your access at any time</li>
          </ul>
          
          <p><strong>Don't have a DigiVault account?</strong> <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup">Sign up here</a> to accept this invitation.</p>
        </div>
        <div class="footer">
          <p>This invitation was sent by DigiVault. If you didn't expect this invitation, you can safely ignore this email.</p>
          <p>© 2024 DigiVault. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}
