import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getAuthToken } from '../utils/api';

export const AuthDebug: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<{
    isLoggedIn: boolean;
    user: any;
    session: any;
    token: string | null;
    tokenExpiry: Date | null;
    error: string | null;
  }>({
    isLoggedIn: false,
    user: null,
    session: null,
    token: null,
    tokenExpiry: null,
    error: null
  });

  const checkAuthStatus = async () => {
    try {
      // Check 1: Is user logged in?
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // Check 2: Get session details
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Check 3: Get token using the API helper
      const token = await getAuthToken();
      
      // Calculate token expiry if session exists
      let tokenExpiry = null;
      if (session?.expires_at) {
        tokenExpiry = new Date(session.expires_at * 1000);
      }
      
      setAuthStatus({
        isLoggedIn: !!user,
        user: user,
        session: session,
        token: token,
        tokenExpiry: tokenExpiry,
        error: userError?.message || sessionError?.message || null
      });
    } catch (error) {
      setAuthStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  const testAPICall = async () => {
    try {
      console.log('Starting test API call...');
      
      // Add timeout to getAuthToken
      const tokenPromise = getAuthToken();
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('getAuthToken timeout after 10s')), 10000)
      );
      
      const token = await Promise.race([tokenPromise, timeoutPromise]);
      console.log('Token being sent:', token);
      
      // Decode token to inspect contents (base64 decode)
      if (token) {
        try {
          const parts = token.split('.');
          const payload = JSON.parse(atob(parts[1]));
          console.log('Token payload:', payload);
          console.log('Token issued at:', new Date(payload.iat * 1000));
          console.log('Token expires at:', new Date(payload.exp * 1000));
          console.log('Token audience:', payload.aud);
          console.log('Token issuer:', payload.iss);
        } catch (e) {
          console.error('Failed to decode token:', e);
        }
      }
      
      // Test API call to user profile
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://dishplay-backend.onrender.com'}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('API Response status:', response.status);
      console.log('API Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        alert(`API Error (${response.status}): ${errorText}`);
      } else {
        const data = await response.json();
        console.log('API Success response:', data);
        alert('API call successful! Check console for details.');
      }
    } catch (error) {
      console.error('Test API call failed:', error);
      alert(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuthStatus();
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const isTokenExpired = authStatus.tokenExpiry ? new Date() > authStatus.tokenExpiry : false;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      background: 'white',
      border: '2px solid #ccc',
      borderRadius: '8px',
      padding: '16px',
      maxWidth: '400px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <h3 style={{ margin: '0 0 12px 0' }}>Auth Debug Info</h3>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>1. Login Status:</strong> {authStatus.isLoggedIn ? '✅ Logged In' : '❌ Not Logged In'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>2. User Email:</strong> {authStatus.user?.email || 'None'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>3. Session Status:</strong> {authStatus.session ? '✅ Active' : '❌ No Session'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>4. Token:</strong> {authStatus.token ? `${authStatus.token.substring(0, 20)}...` : '❌ No Token'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>5. Token Expiry:</strong> {
          authStatus.tokenExpiry 
            ? `${authStatus.tokenExpiry.toLocaleString()} ${isTokenExpired ? '❌ EXPIRED' : '✅ Valid'}`
            : 'N/A'
        }
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>6. API URL:</strong> {import.meta.env.VITE_API_URL || 'https://dishplay-backend.onrender.com'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>7. Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'Not set'}
      </div>
      
      {authStatus.error && (
        <div style={{ marginBottom: '8px', color: 'red' }}>
          <strong>Error:</strong> {authStatus.error}
        </div>
      )}
      
      <div style={{ marginBottom: '8px' }}>
        <strong>8. Memory Usage:</strong> {
          (performance as any).memory 
            ? `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB used`
            : 'Not available'
        }
      </div>
      
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
        <button 
          onClick={checkAuthStatus}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Refresh Status
        </button>
        
        <button 
          onClick={testAPICall}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Test API Call
        </button>
        
        <button 
          onClick={async () => {
            if (!supabase) {
              alert('Supabase not available');
              return;
            }
            try {
              console.log('Refreshing auth session...');
              const { data, error } = await supabase.auth.refreshSession();
              if (error) {
                console.error('Refresh failed:', error);
                alert(`Refresh failed: ${error.message}`);
              } else {
                console.log('Refresh successful');
                alert('Auth session refreshed!');
                checkAuthStatus(); // Update display
              }
            } catch (error) {
              console.error('Refresh error:', error);
              alert(`Refresh error: ${error instanceof Error ? error.message : 'Unknown'}`);
            }
          }}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            backgroundColor: '#f0f0f0'
          }}
        >
          Refresh Auth
        </button>
      </div>
    </div>
  );
};