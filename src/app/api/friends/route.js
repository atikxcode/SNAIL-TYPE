// app/api/friends/route.js
import clientPromise from '@/lib/db/mongoClient';
import { DB_NAME } from '@/lib/db/mongoClient';
import { verifyAuth } from '@/lib/auth/verify';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }), 
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        } 
      );
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'all'; // 'all', 'pending', 'accepted'

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    let query = { $or: [{ userId: user.uid }, { friendId: user.uid }] };

    // Add status filter based on tab
    if (tab !== 'all') {
      query.status = tab;
    }

    const friends = await db.collection('friends').find(query).toArray();

    // Get friend IDs (the ones that are not the current user)
    const friendIds = friends
      .filter(friendship => friendship.status === 'accepted')
      .map(friendship => 
        friendship.userId === user.uid ? friendship.friendId : friendship.userId
      );

    // Get user details for friends
    const friendDetails = [];
    if (friendIds.length > 0) {
      const supabase = await import('@supabase/supabase-js').then(module => module.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY));
      
      const { data: users, error } = await supabase
        .from('users')
        .select('id, display_name, photo_url')
        .in('firebase_uid', friendIds);
      
      if (!error && users) {
        // Get latest stats for each friend
        for (const friend of users) {
          const { data: stats, error: statsError } = await supabase
            .from('user_stats')
            .select('best_wpm, level, current_tier')
            .eq('user_id', friend.id)
            .single();
          
          friendDetails.push({
            ...friend,
            stats: stats || { best_wpm: 0, level: 1, current_tier: 'Bronze' }
          });
        }
      }
    }

    // Separate pending requests (incoming and outgoing)
    const pendingRequests = friends.filter(friendship => friendship.status === 'pending');
    const incomingRequests = pendingRequests.filter(req => req.friendId === user.uid);
    const outgoingRequests = pendingRequests.filter(req => req.userId === user.uid);

    return new Response(
      JSON.stringify({ 
        success: true,
        friends: friendDetails,
        incomingRequests,
        outgoingRequests
      }), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  } catch (error) {
    console.error('Get friends error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch friends', details: error.message }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  }
}

export async function POST(request) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }), 
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        } 
      );
    }

    const { friendEmailOrId } = await request.json();

    if (!friendEmailOrId) {
      return new Response(
        JSON.stringify({ error: 'Friend email or ID is required' }), 
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        } 
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Get the friend's user ID by their email or Firebase UID
    const supabase = await import('@supabase/supabase-js').then(module => module.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY));
    
    let friendUser;
    
    // Try to find by Firebase UID first
    const { data: userByUid, error: uidError } = await supabase
      .from('users')
      .select('id, firebase_uid')
      .eq('firebase_uid', friendEmailOrId)
      .single();
    
    if (userByUid) {
      friendUser = userByUid;
    } else {
      // Try to find by email
      const { data: userByEmail, error: emailError } = await supabase
        .from('users')
        .select('id, firebase_uid')
        .eq('email', friendEmailOrId)
        .single();
        
      if (userByEmail) {
        friendUser = userByEmail;
      }
    }

    if (!friendUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }), 
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        } 
      );
    }

    // Check if a friendship already exists
    const existingFriendship = await db.collection('friends').findOne({
      $or: [
        { userId: user.uid, friendId: friendUser.firebase_uid },
        { userId: friendUser.firebase_uid, friendId: user.uid }
      ]
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return new Response(
          JSON.stringify({ error: 'Already friends' }), 
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          } 
        );
      } else if (existingFriendship.status === 'pending' && existingFriendship.userId === user.uid) {
        return new Response(
          JSON.stringify({ error: 'Friend request already sent' }), 
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          } 
        );
      } else if (existingFriendship.status === 'pending' && existingFriendship.friendId === user.uid) {
        // If there's a pending request from the other user, automatically accept it
        const { error } = await db.collection('friends').updateOne(
          { _id: existingFriendship._id },
          { $set: { status: 'accepted', updatedAt: new Date() } }
        );
        
        if (error) throw error;
        
        // Also create the reverse relationship if it doesn't exist
        const inverseFriendship = await db.collection('friends').findOne({
          userId: friendUser.firebase_uid,
          friendId: user.uid
        });
        
        if (!inverseFriendship) {
          await db.collection('friends').insertOne({
            userId: friendUser.firebase_uid,
            friendId: user.uid,
            status: 'accepted',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Friend request accepted, friendship established' 
          }), 
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          } 
        );
      }
    }

    // Create a new friend request
    const newFriendRequest = {
      userId: user.uid,
      friendId: friendUser.firebase_uid,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('friends').insertOne(newFriendRequest);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Friend request sent successfully',
        requestId: result.insertedId.toString()
      }), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  } catch (error) {
    console.error('Add friend error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to add friend', details: error.message }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  }
}

export async function PUT(request) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }), 
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        } 
      );
    }

    const { friendId, action } = await request.json(); // action: 'accept', 'reject', 'remove', 'block'

    if (!friendId || !action) {
      return new Response(
        JSON.stringify({ error: 'Friend ID and action are required' }), 
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        } 
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Find the friendship request
    const friendship = await db.collection('friends').findOne({
      userId: friendId,
      friendId: user.uid
    });

    if (!friendship) {
      return new Response(
        JSON.stringify({ error: 'Friend request not found' }), 
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        } 
      );
    }

    let updatedFriendship = null;
    let message = '';

    switch (action) {
      case 'accept':
        // Accept the friend request
        updatedFriendship = await db.collection('friends').findOneAndUpdate(
          { _id: friendship._id },
          { 
            $set: { 
              status: 'accepted', 
              updatedAt: new Date() 
            } 
          },
          { returnDocument: 'after' }
        );
        message = 'Friend request accepted';

        // Create reciprocal relationship if it doesn't exist
        const inverseFriendship = await db.collection('friends').findOne({
          userId: user.uid,
          friendId: friendId
        });
        
        if (!inverseFriendship) {
          await db.collection('friends').insertOne({
            userId: user.uid,
            friendId: friendId,
            status: 'accepted',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        break;

      case 'reject':
        // Reject the friend request
        updatedFriendship = await db.collection('friends').findOneAndUpdate(
          { _id: friendship._id },
          { 
            $set: { 
              status: 'rejected', 
              updatedAt: new Date() 
            } 
          },
          { returnDocument: 'after' }
        );
        message = 'Friend request rejected';
        break;

      case 'remove':
        // Remove the friendship
        await db.collection('friends').deleteOne({ _id: friendship._id });
        
        // Remove reciprocal relationship if it exists
        await db.collection('friends').deleteOne({
          userId: user.uid,
          friendId: friendId
        });
        
        message = 'Friend removed';
        break;

      case 'block':
        // Block the user
        updatedFriendship = await db.collection('friends').findOneAndUpdate(
          { _id: friendship._id },
          { 
            $set: { 
              status: 'blocked', 
              updatedAt: new Date() 
            } 
          },
          { returnDocument: 'after' }
        );
        message = 'User blocked';
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }), 
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          } 
        );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        friendship: updatedFriendship
      }), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  } catch (error) {
    console.error('Update friend error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update friend status', details: error.message }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      } 
    );
  }
}