import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';

class ApiException implements Exception {
  final String message;
  final int statusCode;
  final String? code;

  const ApiException(this.message, {this.statusCode = 0, this.code});

  bool get isRetryableNetworkError =>
      statusCode == 0 ||
      statusCode == 408 ||
      statusCode == 429 ||
      statusCode >= 500;

  bool get isPermanentRejection =>
      statusCode == 400 ||
      statusCode == 403 ||
      statusCode == 404 ||
      statusCode == 422;

  @override
  String toString() => message;
}

bool isConnectivityFailure(Object error) {
  if (error is ApiException) return error.isRetryableNetworkError;
  return error is SocketException ||
      error is TimeoutException ||
      error is http.ClientException ||
      error is HandshakeException;
}

/// Centralized authenticated HTTP client for all Geters mobile repositories.
class ApiClient {
  final http.Client _client;
  final String baseUrl;
  String? authToken;
  void Function()? onUnauthorized;

  ApiClient({
    http.Client? client,
    this.baseUrl = ApiConstants.baseUrl,
    this.authToken,
    this.onUnauthorized,
  }) : _client = client ?? http.Client();

  void setAuthToken(String? token) {
    authToken = token;
  }

  Map<String, String> _buildHeaders([Map<String, String>? extra]) {
    return <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (authToken != null && authToken!.isNotEmpty)
        'Authorization': 'Bearer $authToken',
      ...?extra,
    };
  }

  Uri _buildUri(String path, [Map<String, String>? queryParameters]) {
    final normalized = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('$baseUrl$normalized');
    if (queryParameters != null && queryParameters.isNotEmpty) {
      return uri.replace(queryParameters: queryParameters);
    }
    return uri;
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, String>? queryParameters,
    Map<String, String>? headers,
    Duration timeout = const Duration(seconds: 12),
  }) async {
    final response = await _client
        .get(_buildUri(path, queryParameters), headers: _buildHeaders(headers))
        .timeout(timeout);
    return _decodeResponse(response);
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Object? body,
    Map<String, String>? headers,
    Duration timeout = const Duration(seconds: 15),
  }) async {
    final response = await _client
        .post(
          _buildUri(path),
          headers: _buildHeaders(headers),
          body: body != null ? json.encode(body) : null,
        )
        .timeout(timeout);
    return _decodeResponse(response);
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    Object? body,
    Map<String, String>? headers,
    Duration timeout = const Duration(seconds: 15),
  }) async {
    final response = await _client
        .patch(
          _buildUri(path),
          headers: _buildHeaders(headers),
          body: body != null ? json.encode(body) : null,
        )
        .timeout(timeout);
    return _decodeResponse(response);
  }

  Future<Map<String, dynamic>> delete(
    String path, {
    Map<String, String>? headers,
    Duration timeout = const Duration(seconds: 12),
  }) async {
    final response = await _client
        .delete(_buildUri(path), headers: _buildHeaders(headers))
        .timeout(timeout);
    return _decodeResponse(response);
  }

  Map<String, dynamic> _decodeResponse(http.Response response) {
    Map<String, dynamic>? decoded;
    try {
      final raw = json.decode(response.body);
      if (raw is Map<String, dynamic>) {
        decoded = raw;
      }
    } catch (_) {
      // Non-JSON response
    }

    if (response.statusCode == 401) {
      onUnauthorized?.call();
    }

    if (response.statusCode >= 200 &&
        response.statusCode < 300 &&
        decoded?['success'] == true) {
      return decoded!;
    }

    final errorObj = decoded?['error'];
    final message = (errorObj is Map ? errorObj['message']?.toString() : null) ??
        'Server xatoligi (HTTP ${response.statusCode})';
    final code = errorObj is Map ? errorObj['code']?.toString() : null;
    throw ApiException(message, statusCode: response.statusCode, code: code);
  }
}
