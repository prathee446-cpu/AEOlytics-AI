import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function markdownToHtml(md: string): string {
  let html = md;
  // Headings
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Lists (unordered)
  html = html.replace(/^\- (.*?)$/gm, '<li>$1</li>');
  
  // Convert line breaks and wrap in paragraph blocks
  const blocks = html.split('\n\n');
  const formattedBlocks = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<ul>')) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
  });

  return formattedBlocks.join('\n');
}

export class PublishService {
  static async publishToWordPress(
    title: string,
    content: string,
    details: {
      websiteUrl: string;
      username: string;
      applicationPassword: string;
      existingUrlOrId?: string;
      status: 'draft' | 'publish' | 'update';
    }
  ): Promise<{ liveUrl: string }> {
    const { websiteUrl, username, applicationPassword, existingUrlOrId, status } = details;
    const cleanUrl = websiteUrl.trim().replace(/\/$/, '');
    const htmlContent = markdownToHtml(content);

    const authHeader = `Basic ${Buffer.from(`${username.trim()}:${applicationPassword.trim()}`).toString('base64')}`;

    let postId: string | null = null;
    if (existingUrlOrId && existingUrlOrId.trim().length > 0) {
      const input = existingUrlOrId.trim();
      if (/^\d+$/.test(input)) {
        postId = input;
      } else {
        try {
          const urlObj = new URL(input);
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          const slug = pathParts[pathParts.length - 1];
          if (slug) {
            // Search posts
            const searchRes = await fetch(`${cleanUrl}/wp-json/wp/v2/posts?slug=${slug}`, {
              headers: { Authorization: authHeader },
            });
            if (searchRes.ok) {
              const postsList = await searchRes.json() as any[];
              if (postsList && postsList.length > 0) {
                postId = postsList[0].id.toString();
              } else {
                // Search pages
                const pagesRes = await fetch(`${cleanUrl}/wp-json/wp/v2/pages?slug=${slug}`, {
                  headers: { Authorization: authHeader },
                });
                if (pagesRes.ok) {
                  const pagesList = await pagesRes.json() as any[];
                  if (pagesList && pagesList.length > 0) {
                    postId = pagesList[0].id.toString();
                  }
                }
              }
            }
          }
        } catch (e) {
          postId = input;
        }
      }
    }

    const isUpdate = !!postId;
    const endpoint = isUpdate 
      ? `${cleanUrl}/wp-json/wp/v2/posts/${postId}` 
      : `${cleanUrl}/wp-json/wp/v2/posts`;

    const body: any = {
      title,
      content: htmlContent,
      status: status === 'draft' ? 'draft' : 'publish',
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`WordPress API returned ${res.status}: ${errText}`);
    }

    const resData = await res.json() as any;
    return {
      liveUrl: resData.link || `${cleanUrl}/?p=${resData.id}`,
    };
  }

  static async publishToShopify(
    title: string,
    content: string,
    details: {
      storeUrl: string;
      adminToken: string;
      blogId: string;
      articleId?: string;
    }
  ): Promise<{ liveUrl: string }> {
    const { storeUrl, adminToken, blogId, articleId } = details;
    const cleanStoreUrl = storeUrl.trim().replace(/\/$/, '').replace(/^https?:\/\//, '');
    const htmlContent = markdownToHtml(content);

    const isUpdate = !!articleId && articleId.trim().length > 0;
    const endpoint = isUpdate
      ? `https://${cleanStoreUrl}/admin/api/2024-01/blogs/${blogId.trim()}/articles/${articleId.trim()}.json`
      : `https://...`; // Not realistic placeholder, let's make it fully concrete:
    const realEndpoint = isUpdate
      ? `https://${cleanStoreUrl}/admin/api/2024-01/blogs/${blogId.trim()}/articles/${articleId.trim()}.json`
      : `https://${cleanStoreUrl}/admin/api/2024-01/blogs/${blogId.trim()}/articles.json`;

    const method = isUpdate ? 'PUT' : 'POST';

    const body = isUpdate 
      ? { article: { id: parseInt(articleId.trim()), body_html: htmlContent } }
      : { article: { title, body_html: htmlContent } };

    const res = await fetch(realEndpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': adminToken.trim(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Shopify API returned ${res.status}: ${errText}`);
    }

    const resData = await res.json() as any;
    const article = resData.article;
    return {
      liveUrl: article.url || `https://${cleanStoreUrl}/blogs/news/${article.handle || article.id}`,
    };
  }

  static async publishToWebflow(
    title: string,
    content: string,
    details: {
      siteId: string;
      collectionId: string;
      cmsToken: string;
      itemId?: string;
    }
  ): Promise<{ liveUrl: string }> {
    const { siteId, collectionId, cmsToken, itemId } = details;
    const htmlContent = markdownToHtml(content);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const isUpdate = !!itemId && itemId.trim().length > 0;
    const endpoint = isUpdate
      ? `https://api.webflow.com/v2/collections/${collectionId.trim()}/items/${itemId.trim()}`
      : `https://api.webflow.com/v2/collections/${collectionId.trim()}/items`;

    const method = isUpdate ? 'PATCH' : 'POST';

    const body = {
      isArchived: false,
      isDraft: false,
      fieldData: {
        name: title,
        slug,
        'post-body': htmlContent,
      },
    };

    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cmsToken.trim()}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Webflow API returned ${res.status}: ${errText}`);
    }

    const resData = await res.json() as any;
    return {
      liveUrl: resData.slug 
        ? `https://webflow.com/design/${siteId.trim()}` 
        : `https://api.webflow.com/v2/collections/${collectionId}/items`,
    };
  }

  static async publishToCustom(
    title: string,
    content: string,
    details: {
      endpoint: string;
      apiKey: string;
      method: string;
      contentField: string;
    }
  ): Promise<{ liveUrl: string }> {
    const { endpoint, apiKey, method, contentField } = details;
    const htmlContent = markdownToHtml(content);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey && apiKey.trim().length > 0) {
      if (apiKey.toLowerCase().startsWith('bearer ')) {
        headers['Authorization'] = apiKey.trim();
      } else {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
        headers['x-api-key'] = apiKey.trim();
      }
    }

    const body = {
      title,
      [contentField.trim()]: htmlContent,
    };

    const res = await fetch(endpoint.trim(), {
      method: method.trim().toUpperCase(),
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Custom API returned ${res.status}: ${errText}`);
    }

    let liveUrl = endpoint.trim();
    try {
      const resData = await res.json() as any;
      if (resData.url || resData.liveUrl || resData.link) {
        liveUrl = resData.url || resData.liveUrl || resData.link;
      }
    } catch (e) {
      // ignore json parse error, fallback to endpoint
    }

    return { liveUrl };
  }
}
