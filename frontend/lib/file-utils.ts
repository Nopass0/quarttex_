/**
 * Get the full URL for a file upload
 * Handles both relative and absolute URLs
 */
export function getFileUrl(url: string): string {
  // If already an absolute URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Get the base API URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  
  // Remove /api suffix to get the base backend URL
  const baseUrl = apiUrl.replace(/\/api$/, '');
  
  // Ensure the URL starts with /
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  
  return `${baseUrl}${cleanUrl}`;
}

/**
 * Check if a URL is for a file upload
 */
export function isUploadUrl(url: string): boolean {
  return url.includes('/uploads/');
}