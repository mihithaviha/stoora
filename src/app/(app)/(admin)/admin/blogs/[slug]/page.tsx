import { BlogEditor } from '@/components/admin/BlogEditor';

export default async function AdminBlogEditPage({ params }: { params: Promise<{ slug: string }> }) {
  return <BlogEditor slug={(await params).slug} />;
}
