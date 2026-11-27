package uz.kelishamizgroup.geters

import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.os.Build
import android.os.Handler
import android.os.Looper
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class MainActivity : FlutterActivity() {
    private val channelName = "com.geters.mobile/video_thumbnail"
    private val thumbnailChannelName = "com.geters.mobile/video_thumbnail"
    private val shareChannelName = "com.geters.mobile/share"
    private val thumbnailExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, thumbnailChannelName)
            .setMethodCallHandler { call, result ->
                if (call.method == "getThumbnail") {
                    val url = call.argument<String>("url")?.trim()
                    val maxWidth = call.argument<Int>("maxWidth") ?: 720
                    if (url.isNullOrEmpty()) {
                        result.success(null)
                        return@setMethodCallHandler
                    }
                    thumbnailExecutor.execute {
                        val bytes = loadOrExtractThumbnail(url, maxWidth.coerceIn(120, 1440))
                        mainHandler.post {
                            result.success(bytes)
                        }
                    }
                } else {
                    result.notImplemented()
                }
            }

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, shareChannelName)
            .setMethodCallHandler { call, result ->
                if (call.method == "shareText") {
                    val text = call.argument<String>("text")?.trim()
                    val subject = call.argument<String>("subject")?.trim()
                    if (text.isNullOrEmpty()) {
                        result.success(false)
                        return@setMethodCallHandler
                    }
                    try {
                        val sendIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, text)
                            if (!subject.isNullOrEmpty()) {
                                putExtra(Intent.EXTRA_SUBJECT, subject)
                            }
                        }
                        val chooser = Intent.createChooser(sendIntent, "Ulashish")
                        startActivity(chooser)
                        result.success(true)
                    } catch (_: Exception) {
                        result.success(false)
                    }
                } else {
                    result.notImplemented()
                }
            }
    }

    private fun loadOrExtractThumbnail(url: String, maxWidth: Int): ByteArray? {
        val cacheDir = File(applicationContext.cacheDir, "video_thumbs")
        if (!cacheDir.exists()) {
            cacheDir.mkdirs()
        }
        val cacheKey = sha256Hex("${url}_$maxWidth")
        val cacheFile = File(cacheDir, "$cacheKey.jpg")
        if (cacheFile.exists() && cacheFile.length() > 0L) {
            return try {
                cacheFile.readBytes()
            } catch (_: Exception) {
                null
            }
        }

        val retriever = MediaMetadataRetriever()
        var bitmap: Bitmap? = null
        var scaledBitmap: Bitmap? = null
        return try {
            retriever.setDataSource(url, HashMap<String, String>())
            bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                retriever.getScaledFrameAtTime(
                    0L,
                    MediaMetadataRetriever.OPTION_CLOSEST_SYNC,
                    maxWidth,
                    maxWidth,
                ) ?: retriever.getFrameAtTime(0L, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
            } else {
                retriever.getFrameAtTime(0L, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
            }

            if (bitmap == null) {
                bitmap = retriever.getFrameAtTime(-1L)
            }
            val source = bitmap ?: return null

            val outBitmap = if (source.width > maxWidth || source.height > maxWidth) {
                val ratio = minOf(
                    maxWidth.toFloat() / source.width.toFloat(),
                    maxWidth.toFloat() / source.height.toFloat(),
                )
                val targetW = (source.width * ratio).toInt().coerceAtLeast(1)
                val targetH = (source.height * ratio).toInt().coerceAtLeast(1)
                val created = Bitmap.createScaledBitmap(source, targetW, targetH, true)
                scaledBitmap = created
                created
            } else {
                source
            }

            val stream = ByteArrayOutputStream()
            outBitmap.compress(Bitmap.CompressFormat.JPEG, 82, stream)
            val bytes = stream.toByteArray()
            if (bytes.isEmpty()) return null

            val tmpFile = File(cacheDir, "$cacheKey.tmp")
            tmpFile.writeBytes(bytes)
            if (!tmpFile.renameTo(cacheFile)) {
                cacheFile.writeBytes(bytes)
                tmpFile.delete()
            }
            bytes
        } catch (_: Exception) {
            null
        } finally {
            if (scaledBitmap != null && scaledBitmap !== bitmap) {
                scaledBitmap.recycle()
            }
            bitmap?.recycle()
            try {
                retriever.release()
            } catch (_: Exception) {
                // Ignore release errors
            }
        }
    }

    private fun sha256Hex(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }

    override fun onDestroy() {
        thumbnailExecutor.shutdownNow()
        super.onDestroy()
    }
}
