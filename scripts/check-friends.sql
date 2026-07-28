SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.status, up1.display_name as from_name, up2.display_name as to_name 
FROM friend_requests fr 
LEFT JOIN user_profiles up1 ON up1.id = fr.from_user_id 
LEFT JOIN user_profiles up2 ON up2.id = fr.to_user_id 
ORDER BY fr.created_at DESC LIMIT 20;
