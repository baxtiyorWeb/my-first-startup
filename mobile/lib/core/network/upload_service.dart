import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mime/mime.dart';
import '../constants/api_constants.dart';

class UploadException implements Exception {
  final String message;
  const UploadException(this.message);

  @override
  String toString() => message;
}

class UploadResult {
  final String url;
  final String? path;
  final String fileName;
  final int size;
  final String mimeType;
  final String mediaType;
  final int? durationSeconds;
  final bool isShort;

  const UploadResult({
    required this.url,
    this.path,
    required this.fileName,
    required this.size,
    required this.mimeType,
    this.mediaType = 'image',
    this.durationSeconds,
    this.isShort = false,
  });
}

class ValidatedMediaFile {
  final int size;
  final String mimeType;
  const ValidatedMediaFile({required this.size, required this.mimeType});
}

abstract class UploadService {
  Future<ValidatedMediaFile> validateImage(XFile file);
  Future<ValidatedMediaFile> validateVideo(XFile file);
  Future<UploadResult> uploadImage(
    XFile file, {
    String folder = 'posts',
    String? authToken,
  });
  Future<UploadResult> uploadVideo(
    XFile file, {
    String folder = 'shorts',
    String? authToken,
  });
}

class UploadServiceImpl implements UploadService {
  static const int maxImageSizeBytes = 10 * 1024 * 1024; // 10MB matching backend
  static const int maxVideoSizeBytes = 50 * 1024 * 1024; // 50MB matching backend
  static const Set<String> allowedImageMimes = {
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  };
  static const Set<String> allowedVideoMimes = {
    'video/mp4',
    'video/quicktime',
    'video/webm',
  };

  final String _baseUrl;

  UploadServiceImpl({this._baseUrl = ApiConstants.baseUrl});

  @override
  Future<ValidatedMediaFile> validateImage(XFile file) async {
    final size = await file.length();
    if (size > maxImageSizeBytes) {
      throw const UploadException('Rasm hajmi 10MB dan oshmasligi kerak');
    }

    String mimeType = lookupMimeType(file.path) ?? 'image/jpeg';
    if (mimeType == 'image/jpg') mimeType = 'image/jpeg';

    if (!allowedImageMimes.contains(mimeType)) {
      throw const UploadException(
        'Faqat JPEG, PNG, WebP yoki GIF formatdagi rasmlar qabul qilinadi',
      );
    }

    return ValidatedMediaFile(size: size, mimeType: mimeType);
  }

  @override
  Future<ValidatedMediaFile> validateVideo(XFile file) async {
    final size = await file.length();
    if (size > maxVideoSizeBytes) {
      throw const UploadException('Video hajmi 50MB dan oshmasligi kerak');
    }

    final mimeType = lookupMimeType(file.path) ?? 'video/mp4';
    if (!allowedVideoMimes.contains(mimeType)) {
      throw const UploadException(
        'Faqat MP4, MOV yoki WebM formatdagi videolar qabul qilinadi',
      );
    }

    return ValidatedMediaFile(size: size, mimeType: mimeType);
  }

  @override
  Future<UploadResult> uploadImage(
    XFile file, {
    String folder = 'posts',
    String? authToken,
  }) async {
    final validated = await validateImage(file);
    return _uploadMultipart(
      file: file,
      validated: validated,
      folder: folder,
      authToken: authToken,
      timeout: const Duration(seconds: 25),
    );
  }

  @override
  Future<UploadResult> uploadVideo(
    XFile file, {
    String folder = 'shorts',
    String? authToken,
  }) async {
    final validated = await validateVideo(file);
    return _uploadMultipart(
      file: file,
      validated: validated,
      folder: folder,
      authToken: authToken,
      timeout: const Duration(seconds: 90),
    );
  }

  Future<UploadResult> _uploadMultipart({
    required XFile file,
    required ValidatedMediaFile validated,
    required String folder,
    String? authToken,
    required Duration timeout,
  }) async {
    final fileName = file.name.isNotEmpty
        ? file.name
        : file.path.split(Platform.pathSeparator).last;

    try {
      final uri = Uri.parse('$_baseUrl${ApiConstants.uploadEndpoint}');
      final request = http.MultipartRequest('POST', uri);

      if (authToken != null && authToken.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $authToken';
      }

      request.fields['folder'] = folder;
      request.files.add(
        await http.MultipartFile.fromPath(
          'file',
          file.path,
          filename: fileName,
          contentType: MediaType.parse(validated.mimeType),
        ),
      );

      final streamed = await request.send().timeout(timeout);
      final response = await http.Response.fromStream(streamed);
      final decoded = json.decode(response.body) as Map<String, dynamic>?;

      if (response.statusCode >= 200 &&
          response.statusCode < 300 &&
          decoded?['success'] == true &&
          decoded?['data'] != null) {
        final data = decoded!['data'] as Map<String, dynamic>;
        return UploadResult(
          url: data['url'] as String,
          path: data['path'] as String?,
          fileName: (data['fileName'] as String?) ?? fileName,
          size: (data['size'] as int?) ?? validated.size,
          mimeType: (data['mimeType'] as String?) ?? validated.mimeType,
          mediaType: (data['mediaType'] as String?) ?? 'image',
          durationSeconds: data['durationSeconds'] as int?,
          isShort: (data['isShort'] as bool?) ?? false,
        );
      }

      final errMsg = decoded?['error']?['message']?.toString() ??
          'Fayl yuklashda server xatoligi (${response.statusCode})';
      throw UploadException(errMsg);
    } on UploadException {
      rethrow;
    } catch (_) {
      throw const UploadException(
        'Serverga fayl yuklashda xatolik yuz berdi. Internet aloqasini tekshiring.',
      );
    }
  }
}
