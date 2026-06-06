"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Category } from '../../../../types';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName.trim(), is_active: true }]);

      if (error) throw error;
      toast.success('Category added successfully');
      setNewCategoryName('');
      fetchCategories();
    } catch (error: any) {
      toast.error('Failed to add category: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error: any) {
      toast.error('Failed to delete category: ' + error.message);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success('Category status updated');
      fetchCategories();
    } catch (error: any) {
      toast.error('Failed to update status: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-gray-900">Lead Categories</h2>
          <p className="text-sm text-gray-500">Manage categories and subcategories for leads</p>
        </div>
      </div>

      <form onSubmit={handleAddCategory} className="mb-8 flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name..."
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !newCategoryName.trim()}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Add Category
        </button>
      </form>

      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
        <ul className="divide-y divide-gray-200">
          {categories.map((category) => (
            <li key={category.id}>
              <div className="px-4 py-4 flex items-center sm:px-6 justify-between">
                <div className="flex items-center">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="truncate">
                      <p className="text-sm font-medium text-blue-600 truncate">{category.name}</p>
                    </div>
                  </div>
                </div>
                <div className="ml-5 flex-shrink-0 flex items-center gap-4">
                  <button
                    onClick={() => handleToggleStatus(category.id, category.is_active)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {category.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded-full"
                    title="Delete category"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {categories.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">
              No categories found. Add one above.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};