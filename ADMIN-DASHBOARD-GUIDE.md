# Admin Dashboard Guide

## Access the Admin Dashboard

**URL**: https://turbo-town.com/admin

**Access Control**: Currently restricted to user `dtuleski` (hardcoded in backend)

---

## Features

### Overview Tab 📊

**Key Metrics**:
- Total Users
- DAU (Daily Active Users)
- MAU (Monthly Active Users - estimated)
- Conversion Rate (Free → Paid)

**Games Played**:
- Total Games (all time)
- Today
- This Week
- This Month

**Users by Subscription Tier**:
- FREE, BASIC, PREMIUM breakdown
- User count and percentage per tier
- Average games per user per tier
- Monthly revenue per tier

**Recent Activity**:
- Last 24 Hours stats
- Last 7 Days stats
- Last 30 Days stats
- Shows unique users, total games, avg games per user

**Top 10 Users** 🏆:
- Ranked by total games played
- Shows username, email, tier, games played, last active

---

### Users Tab 👥

**User List**:
- Complete list of all users
- Sortable and filterable

**Columns**:
- Username
- Email
- Subscription Tier (FREE/BASIC/PREMIUM)
- Total Games Played
- Today's Plays
- Rate Limit Status (used/limit)
- Last Active
- Join Date

**Filters**:
- Filter by Tier (All/Free/Basic/Premium)
- Sort by: Join Date, Games Played, Last Active

**Pagination**:
- 50 users per page
- Previous/Next navigation

---

## Analytics Metrics Explained

### DAU (Daily Active Users)
- Unique users who played at least one game today
- Calculated from games table (users with games started today)

### MAU (Monthly Active Users)
- Unique users who played at least one game in the last 30 days
- Estimated based on actual activity

### Conversion Rate
- Percentage of users who upgraded from FREE to paid tiers
- Formula: (BASIC + PREMIUM users) / Total Users × 100

### Rate Limit Status
- Shows how many plays a user has used today
- FREE: 3 plays/day
- BASIC: 20 plays/day
- PREMIUM: Unlimited (999,999)
- Red highlight when user hits limit

---

## Revenue Tracking

**Monthly Recurring Revenue (MRR)**:
- FREE: $0/month
- BASIC: $1.99/month per user
- PREMIUM: $9.99/month per user

**Calculation**:
- Displayed per tier in "Users by Subscription Tier" section
- Total MRR = Sum of all tier revenues

---

## User Management

### View User Details
- Click on any user row to see full details
- See complete activity history
- Check rate limit status
- View subscription tier

### Identify Conversion Opportunities
- Users at rate limit (3/3 plays) are prime upgrade candidates
- Filter by FREE tier to see potential customers
- Sort by "Games Played" to find engaged users

### Monitor Power Users
- Top 10 Users section shows most engaged players
- Track by total games played
- Identify users who might need premium features

---

## Best Practices

### Daily Monitoring
1. Check DAU trend (growing/declining)
2. Review conversion rate
3. Identify users hitting rate limits
4. Monitor top users for engagement

### Weekly Analysis
1. Compare week-over-week DAU
2. Track new user signups
3. Analyze tier distribution changes
4. Review revenue trends

### Monthly Reporting
1. Calculate actual MAU
2. Assess conversion funnel
3. Identify churn patterns
4. Plan marketing campaigns

---

## Technical Details

### Data Sources
- **Cognito**: User accounts and authentication
- **DynamoDB Games Table**: Game activity and plays
- **DynamoDB Rate Limits Table**: Daily usage tracking
- **DynamoDB Subscriptions Table**: Tier assignments

### Refresh Rate
- Data is fetched fresh on every page load
- Click "Refresh" button to update manually
- No caching - always shows real-time data

### Performance
- Queries scan all tables (optimized for small datasets)
- For large user bases (>10,000 users), consider pagination improvements
- Current implementation handles up to 60 Cognito users per query

---

## Future Enhancements

### Planned Features
1. **User Actions**:
   - Manually upgrade/downgrade users
   - Reset rate limits
   - Ban/suspend users

2. **Advanced Analytics**:
   - Cohort analysis
   - Retention curves
   - Revenue forecasting
   - Churn prediction

3. **Export Capabilities**:
   - CSV export of user list
   - Analytics reports
   - Revenue summaries

4. **Real-time Updates**:
   - WebSocket integration
   - Live DAU counter
   - Activity feed

5. **Role-Based Access**:
   - Multiple admin levels
   - Read-only analysts
   - Support team access

---

## Troubleshooting

### "Access Denied" Error
- Only user `dtuleski` can access admin dashboard
- To add more admins, update the check in `services/game/src/handlers/game.handler.ts`
- Look for: `if (userId !== 'dtuleski')`

### No Data Showing
- Check that users have played games
- Verify DynamoDB tables have data
- Check Lambda logs for errors

### Slow Loading
- Large datasets may take time to load
- Consider adding loading indicators
- Implement server-side pagination for scale

---

## Security Notes

⚠️ **Important**: The admin dashboard has full access to:
- All user data (emails, usernames)
- Usage statistics
- Subscription information

**Recommendations**:
1. Implement proper role-based access control (RBAC)
2. Add audit logging for admin actions
3. Use AWS Cognito groups for admin users
4. Add IP whitelisting for admin access
5. Enable MFA for admin accounts

---

## Quick Access

- **Admin Dashboard**: https://turbo-town.com/admin
- **Main App**: https://turbo-town.com
- **API Endpoint**: https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com

---

## Support

For issues or questions:
1. Check Lambda logs in CloudWatch
2. Review API Gateway logs
3. Test GraphQL queries directly
4. Check browser console for errors

Happy monitoring! 📊🎮
