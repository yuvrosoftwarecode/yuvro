import os
import time
import re
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = "Delete proctoring snapshot files older than 90 days"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=90,
            help="Number of days of snapshots to retain (default: 90)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print list of files that would be deleted without actually deleting them",
        )

    def handle(self, *args, **options):
        days = options["days"]
        dry_run = options["dry_run"]
        
        cutoff_sec = time.time() - (days * 24 * 60 * 60)
        cutoff_date = datetime.now() - timedelta(days=days)
        
        self.stdout.write(
            self.style.WARNING(
                f"Starting snapshot cleanup. Retention: {days} days. Cutoff date: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}"
            )
        )
        if dry_run:
            self.stdout.write(self.style.NOTICE("DRY RUN ENABLED - No files will be deleted"))

        media_root = settings.MEDIA_ROOT
        if not media_root or not os.path.exists(media_root):
            self.stdout.write(self.style.ERROR(f"Media root does not exist: {media_root}"))
            return

        deleted_count = 0
        total_size = 0
        skipped_count = 0

        # Regex for snapshot filename, e.g., snapshot_1717762600.png, q12_1717762600.png
        snapshot_re = re.compile(r"^(snapshot|q\d+)_\d+\.(png|jpg|jpeg)$", re.IGNORECASE)

        # Walk through files in MEDIA_ROOT
        for root, dirs, files in os.walk(media_root):
            for file in files:
                if not snapshot_re.match(file):
                    continue
                
                file_path = os.path.join(root, file)
                try:
                    mtime = os.path.getmtime(file_path)
                    
                    # Also try to parse timestamp from filename for extra safety
                    # e.g., snapshot_1717762600.png -> 1717762600
                    parts = os.path.splitext(file)[0].split("_")
                    filename_ts = None
                    if len(parts) >= 2 and parts[-1].isdigit():
                        filename_ts = int(parts[-1])
                    
                    # Use the older of mtime or filename timestamp
                    compare_time = mtime
                    if filename_ts and filename_ts < mtime:
                        compare_time = filename_ts

                    if compare_time < cutoff_sec:
                        file_size = os.path.getsize(file_path)
                        total_size += file_size
                        deleted_count += 1
                        
                        relative_path = os.path.relpath(file_path, media_root)
                        if dry_run:
                            self.stdout.write(f"[Dry Run] Would delete: {relative_path} ({file_size / 1024:.1f} KB)")
                        else:
                            os.remove(file_path)
                            self.stdout.write(f"Deleted: {relative_path} ({file_size / 1024:.1f} KB)")
                    else:
                        skipped_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"Error processing {file_path}: {str(e)}")
                    )

        # Remove empty directories
        if not dry_run:
            for root, dirs, files in os.walk(media_root, topdown=False):
                # Don't delete media root itself
                if root == media_root:
                    continue
                # If directory is empty, delete it
                if not os.listdir(root):
                    try:
                        os.rmdir(root)
                        self.stdout.write(self.style.SUCCESS(f"Removed empty directory: {os.path.relpath(root, media_root)}"))
                    except Exception as e:
                        pass

        status_prefix = "[Dry Run] Finished:" if dry_run else "Success:"
        self.stdout.write(
            self.style.SUCCESS(
                f"{status_prefix} Deleted {deleted_count} snapshots (Total reclaimed: {total_size / (1024*1024):.2f} MB). Kept {skipped_count} newer snapshots."
            )
        )
