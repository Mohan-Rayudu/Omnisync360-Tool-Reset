import sys
from datetime import datetime, timedelta
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer
from PyQt6.QtGui import QFont, QColor, QPalette, QIcon
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QSplitter, QTreeWidget, QTreeWidgetItem,
    QListWidget, QListWidgetItem, QTextBrowser, QVBoxLayout, QHBoxLayout, QLabel,
    QLineEdit, QFrame, QPushButton, QMessageBox, QProgressBar, QComboBox
)
from supabase import create_client, Client

# ==========================================
# CONFIGURATION
# ==========================================
SUPABASE_URL = "https://kymifrlbbduoloviaybg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5bWlmcmxiYmR1b2xvdmlheWJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjkxODA0OSwiZXhwIjoyMDY4NDk0MDQ5fQ.nfB1aJBRcC1i7peeWDpFzjMa-nO0D5esm4TnxB5e_bQ"

# ==========================================
# BACKGROUND DATA FETCHING & DELETION THREADS
# ==========================================
class DataLoaderThread(QThread):
    data_loaded = pyqtSignal(dict)
    error_occurred = pyqtSignal(str)

    def __init__(self, supabase_client, days_limit=2):
        super().__init__()
        self.supabase = supabase_client
        self.days_limit = days_limit

    def run(self):
        try:
            # 1. Fetch metadata ONLY (Exclude reply_body to save egress)
            # 2. Filter on DB-level instead of fetching full history
            query = self.supabase.table("employee_replies").select(
                "id, employee_email, mailbox, sender_name, sender_email, subject, received_at"
            )
            
            if self.days_limit and self.days_limit > 0:
                cutoff = (datetime.now() - timedelta(days=self.days_limit)).strftime("%Y-%m-%d %H:%M:%S")
                query = query.gte("received_at", cutoff)

            replies_res = query.order("received_at", desc=True).execute()
            replies = replies_res.data or []

            hierarchy = {}
            for reply in replies:
                emp_id = reply.get("employee_email") or "Unassigned Employee"
                mailbox = reply.get("mailbox") or "Unknown Mailbox"

                if emp_id not in hierarchy:
                    hierarchy[emp_id] = {}
                if mailbox not in hierarchy[emp_id]:
                    hierarchy[emp_id][mailbox] = []

                hierarchy[emp_id][mailbox].append(reply)

            self.data_loaded.emit(hierarchy)
        except Exception as e:
            self.error_occurred.emit(str(e))


class DeleteOldMailsThread(QThread):
    deletion_complete = pyqtSignal(int)
    error_occurred = pyqtSignal(str)

    def __init__(self, supabase_client, cutoff_date_str):
        super().__init__()
        self.supabase = supabase_client
        self.cutoff_date_str = cutoff_date_str

    def run(self):
        try:
            res = self.supabase.table("employee_replies").delete().lt("received_at", self.cutoff_date_str).execute()
            deleted_count = len(res.data) if res.data else 0
            self.deletion_complete.emit(deleted_count)
        except Exception as e:
            self.error_occurred.emit(str(e))


class FetchBodyThread(QThread):
    body_loaded = pyqtSignal(dict)

    def __init__(self, supabase_client, reply_id):
        super().__init__()
        self.supabase = supabase_client
        self.reply_id = reply_id

    def run(self):
        try:
            res = self.supabase.table("employee_replies").select("reply_body").eq("id", self.reply_id).single().execute()
            self.body_loaded.emit(res.data or {})
        except Exception:
            self.body_loaded.emit({})

# ==========================================
# MAIN GUI WINDOW
# ==========================================
class OutlookAdminApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Outlook Admin Mailbox Explorer - Supabase Mail Hub")
        self.resize(1450, 880)

        try:
            self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            QMessageBox.critical(self, "Supabase Connection Error", f"Failed to initialize Supabase: {e}")
            sys.exit(1)

        self.raw_hierarchy = {}
        self.current_filtered_replies = []

        self.setup_ui()
        self.apply_modern_outlook_theme()
        self.load_data()

        # Set auto-fetch timer every 5 minutes (300,000 ms)
        self.auto_fetch_timer = QTimer(self)
        self.auto_fetch_timer.timeout.connect(self.load_data)
        self.auto_fetch_timer.start(300000)

    def setup_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # --- TOP TOOLBAR ---
        top_bar = QFrame()
        top_bar.setFixedHeight(56)
        top_bar.setStyleSheet("background-color: #0F6CBD; color: white;")
        top_layout = QHBoxLayout(top_bar)
        top_layout.setContentsMargins(15, 0, 15, 0)
        
        app_title = QLabel("📬 Outlook Admin Workspace")
        app_title.setFont(QFont("Segoe UI", 12, QFont.Weight.Bold))
        top_layout.addWidget(app_title)

        top_layout.addStretch()

        # Global Date Filter Dropdown
        lbl_filter = QLabel("Time Period:")
        lbl_filter.setStyleSheet("font-weight: bold; margin-right: 4px;")
        top_layout.addWidget(lbl_filter)

        self.cmb_global_date_filter = QComboBox()
        self.cmb_global_date_filter.addItems(["Last 2 Days", "Last 7 Days", "All Time"])
        self.cmb_global_date_filter.setCurrentText("Last 2 Days")
        self.cmb_global_date_filter.setStyleSheet("""
            QComboBox {
                background-color: #0B4A8B;
                color: white;
                border: 1px solid #115EA3;
                padding: 5px 12px;
                border-radius: 4px;
                font-weight: bold;
            }
            QComboBox::drop-down { border: none; }
            QComboBox QAbstractItemView {
                background-color: #FFFFFF;
                color: #333333;
                selection-background-color: #E5F0FF;
                selection-color: #0F6CBD;
            }
        """)
        # Trigger full refetch when combo option changes
        self.cmb_global_date_filter.currentIndexChanged.connect(self.load_data)
        top_layout.addWidget(self.cmb_global_date_filter)

        top_layout.addSpacing(15)

        self.btn_delete_old = QPushButton("🗑️ Delete >10 Days")
        self.btn_delete_old.setStyleSheet(
            "background-color: #D13438; color: white; border: none; padding: 6px 14px; border-radius: 4px; font-weight: bold;"
        )
        self.btn_delete_old.clicked.connect(self.confirm_and_delete_old_mails)
        top_layout.addWidget(self.btn_delete_old)

        self.btn_refresh = QPushButton("🔄 Refresh Data")
        self.btn_refresh.setStyleSheet(
            "background-color: #115EA3; color: white; border: none; padding: 6px 14px; border-radius: 4px; font-weight: bold;"
        )
        self.btn_refresh.clicked.connect(self.load_data)
        top_layout.addWidget(self.btn_refresh)

        main_layout.addWidget(top_bar)

        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setFixedHeight(3)
        self.progress_bar.setTextVisible(False)
        self.progress_bar.setStyleSheet("QProgressBar::chunk { background-color: #2899F5; }")
        main_layout.addWidget(self.progress_bar)

        # --- 3-PANE SPLITTER ---
        self.splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(self.splitter)

        # PANE 1: LEFT - TREE
        pane_left = QWidget()
        layout_left = QVBoxLayout(pane_left)
        layout_left.setContentsMargins(8, 8, 8, 8)

        lbl_tree_header = QLabel("EMPLOYEES & MAILBOXES")
        lbl_tree_header.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
        lbl_tree_header.setStyleSheet("color: #0F6CBD; margin-bottom: 5px; letter-spacing: 0.5px;")
        layout_left.addWidget(lbl_tree_header)

        self.tree_explorer = QTreeWidget()
        self.tree_explorer.setHeaderHidden(True)
        self.tree_explorer.itemClicked.connect(self.on_tree_item_selected)
        layout_left.addWidget(self.tree_explorer)

        self.splitter.addWidget(pane_left)

        # PANE 2: MIDDLE - INBOX LIST
        pane_middle = QWidget()
        layout_middle = QVBoxLayout(pane_middle)
        layout_middle.setContentsMargins(8, 8, 8, 8)

        self.lbl_inbox_header = QLabel("Select a mailbox...")
        self.lbl_inbox_header.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        self.lbl_inbox_header.setStyleSheet("color: #242424;")
        layout_middle.addWidget(self.lbl_inbox_header)

        self.txt_search = QLineEdit()
        self.txt_search.setPlaceholderText("🔍 Search emails by subject or sender...")
        self.txt_search.textChanged.connect(self.apply_search_filter)
        layout_middle.addWidget(self.txt_search)

        self.list_emails = QListWidget()
        self.list_emails.itemClicked.connect(self.on_email_selected)
        layout_middle.addWidget(self.list_emails)

        self.splitter.addWidget(pane_middle)

        # PANE 3: RIGHT - READING PANE
        pane_right = QWidget()
        layout_right = QVBoxLayout(pane_right)
        layout_right.setContentsMargins(10, 10, 10, 10)

        self.frame_mail_header = QFrame()
        self.frame_mail_header.setFrameShape(QFrame.Shape.StyledPanel)
        self.frame_mail_header.setStyleSheet("background-color: #F5F5F5; border-radius: 6px; padding: 10px; border: 1px solid #E0E0E0;")
        layout_header = QVBoxLayout(self.frame_mail_header)

        self.lbl_view_subject = QLabel("No Message Selected")
        self.lbl_view_subject.setFont(QFont("Segoe UI", 12, QFont.Weight.Bold))
        self.lbl_view_subject.setWordWrap(True)
        layout_header.addWidget(self.lbl_view_subject)

        self.lbl_view_sender = QLabel("")
        self.lbl_view_sender.setFont(QFont("Segoe UI", 9))
        layout_header.addWidget(self.lbl_view_sender)

        self.lbl_view_date = QLabel("")
        self.lbl_view_date.setFont(QFont("Segoe UI", 8))
        self.lbl_view_date.setStyleSheet("color: #616161;")
        layout_header.addWidget(self.lbl_view_date)

        layout_right.addWidget(self.frame_mail_header)

        self.body_browser = QTextBrowser()
        self.body_browser.setOpenExternalLinks(True)
        layout_right.addWidget(self.body_browser)

        self.splitter.addWidget(pane_right)

        # Ratio split: 35% for Panes 1 & 2, 65% for Pane 3
        self.splitter.setSizes([220, 280, 950])

    # ==========================================
    # DATA LOADING & GLOBAL FILTERING
    # ==========================================
    def load_data(self):
        self.progress_bar.setRange(0, 0)
        self.btn_refresh.setEnabled(False)

        # Map UI combo choice to days_limit
        choice = self.cmb_global_date_filter.currentText()
        days_limit = 2
        if choice == "Last 7 Days":
            days_limit = 7
        elif choice == "All Time":
            days_limit = 0  # 0 means fetch all

        self.loader_thread = DataLoaderThread(self.supabase, days_limit=days_limit)
        self.loader_thread.data_loaded.connect(self.on_raw_data_loaded)
        self.loader_thread.error_occurred.connect(self.handle_error)
        self.loader_thread.start()

    def on_raw_data_loaded(self, hierarchy):
        self.raw_hierarchy = hierarchy
        self.rebuild_tree_with_filters()
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(100)
        self.btn_refresh.setEnabled(True)

    def rebuild_tree_with_filters(self):
        self.tree_explorer.clear()
        self.list_emails.clear()
        self.lbl_inbox_header.setText("Select a mailbox...")

        if not self.raw_hierarchy:
            return

        for emp_id, mailboxes in self.raw_hierarchy.items():
            valid_mailboxes = {}
            total_emp_mails = 0

            for mailbox_email, replies in mailboxes.items():
                if replies:
                    valid_mailboxes[mailbox_email] = replies
                    total_emp_mails += len(replies)

            if valid_mailboxes:
                emp_item = QTreeWidgetItem(self.tree_explorer)
                emp_item.setFont(0, QFont("Segoe UI", 9, QFont.Weight.Bold))
                emp_item.setText(0, f"👤 {emp_id} ({total_emp_mails})")
                emp_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "employee", "id": emp_id})

                for mailbox_email, replies in valid_mailboxes.items():
                    mb_item = QTreeWidgetItem(emp_item)
                    mb_item.setText(0, f"✉️ {mailbox_email} ({len(replies)})")
                    mb_item.setData(0, Qt.ItemDataRole.UserRole, {
                        "type": "mailbox",
                        "email": mailbox_email,
                        "replies": replies
                    })

        self.tree_explorer.expandAll()

    def handle_error(self, err_msg):
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(0)
        self.btn_refresh.setEnabled(True)
        QMessageBox.critical(self, "Data Load Error", f"Error: {err_msg}")

    def on_tree_item_selected(self, item, column):
        data = item.data(0, Qt.ItemDataRole.UserRole)
        if not data or data.get("type") != "mailbox":
            return

        mailbox_email = data["email"]
        replies = data["replies"]
        self.current_filtered_replies = replies
        self.lbl_inbox_header.setText(f"Inbox: {mailbox_email} ({len(replies)} Mails)")
        self.apply_search_filter()

    def apply_search_filter(self):
        if not self.current_filtered_replies:
            self.list_emails.clear()
            return

        query = self.txt_search.text().lower().strip()
        if not query:
            self.render_email_list(self.current_filtered_replies)
            return

        filtered = [
            r for r in self.current_filtered_replies
            if query in (r.get("sender_email") or "").lower()
            or query in (r.get("sender_name") or "").lower()
            or query in (r.get("subject") or "").lower()
            or query in (r.get("reply_body") or "").lower()
        ]
        self.render_email_list(filtered)

    def render_email_list(self, replies):
        self.list_emails.clear()
        now = datetime.now()

        for reply in replies:
            sender = reply.get("sender_name") or reply.get("sender_email") or "Unknown Sender"
            subject = reply.get("subject") or "(No Subject)"
            received = reply.get("received_at") or ""

            is_new = False
            try:
                rec_dt = datetime.strptime(received.split(".")[0], "%Y-%m-%d %H:%M:%S")
                if (now - rec_dt).total_seconds() <= 86400:
                    is_new = True
            except Exception:
                pass

            item_widget = QListWidgetItem(self.list_emails)

            if is_new:
                display_text = f"""
                <div style='border-left: 4px solid #0F6CBD; padding-left: 8px; margin: 2px 0;'>
                    <span style='background-color: #E5F0FF; color: #0F6CBD; font-size: 10px; font-weight: bold; padding: 2px 5px; border-radius: 3px;'>NEW</span>
                    <b style='color: #0F6CBD; font-size: 13px;'> {sender}</b><br>
                    <b style='color: #111111;'>{subject}</b>
                </div>
                """
            else:
                display_text = f"""
                <div style='padding-left: 10px; margin: 2px 0;'>
                    <b style='color: #323130; font-size: 12px;'>{sender}</b><br>
                    <font color='#0F6CBD'>{subject}</font>
                </div>
                """

            label = QLabel(display_text)
            label.setTextFormat(Qt.TextFormat.RichText)
            label.setContentsMargins(4, 4, 4, 4)

            item_widget.setSizeHint(label.sizeHint())
            item_widget.setData(Qt.ItemDataRole.UserRole, reply)
            self.list_emails.addItem(item_widget)
            self.list_emails.setItemWidget(item_widget, label)

    def on_email_selected(self, item):
        reply = item.data(Qt.ItemDataRole.UserRole)
        if not reply:
            return

        subject = reply.get("subject") or "(No Subject)"
        sender_name = reply.get("sender_name") or "Unknown"
        sender_email = reply.get("sender_email") or ""
        received = reply.get("received_at") or ""

        self.lbl_view_subject.setText(subject)
        self.lbl_view_sender.setText(f"From: {sender_name} <{sender_email}>")
        self.lbl_view_date.setText(f"Received: {received}")

        if "reply_body" in reply:
            self.render_email_body(reply)
        else:
            self.body_browser.setHtml("<p style='color: #616161; font-style: italic;'>Loading email content...</p>")
            self.fetch_thread = FetchBodyThread(self.supabase, reply["id"])
            self.fetch_thread.body_loaded.connect(lambda data: self.handle_body_fetched(reply, data))
            self.fetch_thread.start()

    def handle_body_fetched(self, reply, data):
        reply["reply_body"] = data.get("reply_body", "")
        self.render_email_body(reply)

    def render_email_body(self, reply):
        import re
        body = reply.get("reply_body") or "(No Content)"

        cleaned_body = re.sub(r'(\r?\n\s*){2,}', '\n\n', body.strip())
        paragraphs = [p.strip() for p in cleaned_body.splitlines() if p.strip()]
        formatted_body = "".join(f"<p style='margin: 0 0 10px 0;'>{p}</p>" for p in paragraphs)

        html_content = f"""
        <html>
        <head>
            <style>
                body {{ 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    font-size: 13px; 
                    color: #242424; 
                    line-height: 1.4; 
                    margin: 0;
                    padding: 0;
                }}
                .thread-box {{ 
                    border-left: 3px solid #0F6CBD; 
                    padding: 10px; 
                    margin-top: 10px; 
                    background-color: #F5F5F5; 
                    border-radius: 4px; 
                }}
                .body-text {{ 
                    margin-top: 15px; 
                    font-size: 14px; 
                }}
            </style>
        </head>
        <body>
            <div class="thread-box">
                <b>Thread Metadata:</b><br>
                Mailbox Owner ID: {reply.get('employee_email')}<br>
                Recipient Mailbox: {reply.get('mailbox')}
            </div>
            <div class="body-text">
                {formatted_body}
            </div>
        </body>
        </html>
        """
        self.body_browser.setHtml(html_content)

    # ==========================================
    # DELETION OF OLD MAILS (>10 DAYS)
    # ==========================================
    def confirm_and_delete_old_mails(self):
        cutoff = datetime.now() - timedelta(days=10)
        cutoff_str = cutoff.strftime("%Y-%m-%d %H:%M:%S")

        reply = QMessageBox.question(
            self,
            "Confirm Deletion",
            f"Are you sure you want to delete all email replies older than 10 days?\n(Received before: {cutoff_str})",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )

        if reply == QMessageBox.StandardButton.Yes:
            self.progress_bar.setRange(0, 0)
            self.btn_delete_old.setEnabled(False)

            self.del_thread = DeleteOldMailsThread(self.supabase, cutoff_str)
            self.del_thread.deletion_complete.connect(self.on_deletion_complete)
            self.del_thread.error_occurred.connect(self.handle_error)
            self.del_thread.start()

    def on_deletion_complete(self, count):
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(100)
        self.btn_delete_old.setEnabled(True)
        QMessageBox.information(self, "Success", f"Deleted {count} emails older than 10 days.")
        self.load_data()

    # ==========================================
    # THEME & STYLING
    # ==========================================
    def apply_modern_outlook_theme(self):
        self.setStyleSheet("""
            QMainWindow { background-color: #FAF9F8; }
            QSplitter::handle { background-color: #E1DFDD; }
            QTreeWidget {
                background-color: #FFFFFF;
                border: 1px solid #E1DFDD;
                border-radius: 4px;
                padding: 4px;
            }
            QTreeWidget::item { padding: 4px; }
            QTreeWidget::item:selected {
                background-color: #E5F0FF;
                color: #0F6CBD;
                border-radius: 3px;
            }
            QListWidget {
                background-color: #FFFFFF;
                border: 1px solid #E1DFDD;
                border-radius: 4px;
            }
            QListWidget::item:selected {
                background-color: #F0F6FF;
                border-left: 3px solid #0F6CBD;
            }
            QTextBrowser {
                background-color: #FFFFFF;
                border: 1px solid #E1DFDD;
                border-radius: 4px;
                padding: 12px;
            }
            QLineEdit {
                padding: 7px;
                border: 1px solid #C8C6C4;
                border-radius: 4px;
                background-color: #FFFFFF;
            }
            QLineEdit:focus {
                border: 1px solid #0F6CBD;
            }
        """)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setFont(QFont("Segoe UI", 9))
    window = OutlookAdminApp()
    window.show()
    sys.exit(app.exec())