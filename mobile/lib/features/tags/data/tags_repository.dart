import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../models/tag_item.dart';

abstract class TagsRepository {
  Future<List<TagItem>> getTrendingTags({int limit = 12});
  Future<TagSuggestResponse> suggestTags(String query, {int limit = 8});
  Future<List<TagItem>> searchTags({
    String query = '',
    String sort = 'trending',
    int limit = 20,
    int offset = 0,
  });
  Future<TagItem> createTag(String name, {String? description});
}

class TagsRepositoryImpl implements TagsRepository {
  final ApiClient _apiClient;

  TagsRepositoryImpl({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  @override
  Future<List<TagItem>> getTrendingTags({int limit = 12}) async {
    final decoded = await _apiClient.get(
      ApiConstants.tagsTrendingEndpoint,
      queryParameters: {'limit': '$limit'},
    );
    return _parseTagList(decoded['data']);
  }

  @override
  Future<TagSuggestResponse> suggestTags(String query, {int limit = 8}) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) {
      return TagSuggestResponse.empty();
    }

    final decoded = await _apiClient.get(
      ApiConstants.tagsSuggestEndpoint,
      queryParameters: {
        'q': trimmed,
        'limit': '$limit',
      },
    );

    final meta = decoded['meta'] as Map<String, dynamic>? ?? const {};
    return TagSuggestResponse(
      query: (meta['query'] as String?) ?? trimmed,
      items: _parseTagList(decoded['data']),
      exactMatch: meta['exactMatch'] as bool? ?? false,
      canCreate: meta['canCreate'] as bool? ?? false,
      normalizedCandidate: meta['normalizedCandidate'] as String?,
    );
  }

  @override
  Future<List<TagItem>> searchTags({
    String query = '',
    String sort = 'trending',
    int limit = 20,
    int offset = 0,
  }) async {
    final params = <String, String>{
      'sort': sort,
      'limit': '$limit',
      'offset': '$offset',
    };
    final trimmed = query.trim();
    if (trimmed.isNotEmpty) {
      params['q'] = trimmed;
    }

    final decoded = await _apiClient.get(
      ApiConstants.tagsEndpoint,
      queryParameters: params,
    );
    return _parseTagList(decoded['data']);
  }

  @override
  Future<TagItem> createTag(String name, {String? description}) async {
    final body = <String, dynamic>{'name': name.trim()};
    if (description != null && description.trim().isNotEmpty) {
      body['description'] = description.trim();
    }

    final decoded = await _apiClient.post(
      ApiConstants.tagsEndpoint,
      body: body,
    );
    final raw = decoded['data'];
    if (raw is Map<String, dynamic>) {
      return TagItem.fromJson(raw);
    }
    throw const ApiException('Server noto‘g‘ri teg ma’lumotini qaytardi');
  }

  static List<TagItem> _parseTagList(Object? rawList) {
    if (rawList is! List) return const [];
    return rawList
        .whereType<Map<String, dynamic>>()
        .map(TagItem.fromJson)
        .where((tag) => tag.name.isNotEmpty)
        .toList();
  }
}
