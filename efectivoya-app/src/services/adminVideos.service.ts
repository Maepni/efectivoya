import { AdminApiService } from './adminApi.service';
import { Platform } from 'react-native';

export interface VideoInstructivo {
  id: string;
  banco: string;
  video_url: string | null;
  video_cloudinary_id: string | null;
  titulo: string;
  updated_at: string;
}

class AdminVideosServiceClass {
  async listVideos(): Promise<{ success: boolean; data?: { videos: VideoInstructivo[] }; message?: string }> {
    return AdminApiService.get('/admin/contenido/videos');
  }

  async updateVideo(
    banco: string,
    params: { titulo?: string; video?: { uri: string; name: string; type: string } }
  ): Promise<{ success: boolean; data?: { video: VideoInstructivo }; message?: string }> {
    if (params.video) {
      const formData = new FormData();
      if (params.titulo) {
        formData.append('titulo', params.titulo);
      }

      if (Platform.OS === 'web') {
        // En web, params.video.uri es un blob URL o File object
        const response = await fetch(params.video.uri);
        const blob = await response.blob();
        formData.append('video', blob, params.video.name);
      } else {
        formData.append('video', {
          uri: params.video.uri,
          name: params.video.name,
          type: params.video.type,
        } as any);
      }

      return AdminApiService.patchFormData(`/admin/contenido/videos/${banco}`, formData);
    }

    // Solo titulo, sin archivo
    return AdminApiService.patch(`/admin/contenido/videos/${banco}`, { titulo: params.titulo });
  }
}

export const adminVideosService = new AdminVideosServiceClass();
