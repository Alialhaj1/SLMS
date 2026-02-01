/**
 * Debug token saving after login
 */

// Test localStorage
console.log('🔍 Testing localStorage access...');
console.log('accessToken:', localStorage.getItem('accessToken'));
console.log('refreshToken:', localStorage.getItem('refreshToken'));

// Test save
console.log('\n💾 Saving test tokens...');
localStorage.setItem('accessToken', 'test-access-token-123');
localStorage.setItem('refreshToken', 'test-refresh-token-456');

console.log('✅ Saved. Reading back...');
console.log('accessToken:', localStorage.getItem('accessToken'));
console.log('refreshToken:', localStorage.getItem('refreshToken'));

// Test with apiClient
import { apiClient } from './lib/apiClient';

console.log('\n📡 Testing API client...');
console.log('getAccessToken():', apiClient['getAccessToken']());

export {};
