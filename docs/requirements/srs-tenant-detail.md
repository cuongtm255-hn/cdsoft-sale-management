# **Đặc tả nghiệp vụ toàn diện hệ thống quản lý bán hàng và vận hành doanh nghiệp thương mại SME**

## **Chương I: Khung chiến lược và kiến trúc nghiệp vụ tổng thể**

Trong kỷ nguyên số hóa hiện nay, các doanh nghiệp thương mại quy mô vừa và nhỏ (SME) không còn có thể dựa vào các phương thức quản lý thủ công hoặc các bảng tính rời rạc để duy trì lợi thế cạnh tranh. Sự phức tạp của thị trường yêu cầu một hệ thống quản lý bán hàng (Sales Management System) tích hợp sâu, có khả năng điều phối nhịp nhàng giữa các dòng chảy: hàng hóa, tiền tệ và thông tin.1 Một hệ thống nghiệp vụ chuẩn mực cho SME không chỉ đơn thuần là công cụ ghi chép giao dịch mà phải là một hệ sinh thái quản trị, nơi mỗi dữ liệu đầu vào đều trở thành cơ sở cho các quyết định chiến lược của ban lãnh đạo.3

Kiến trúc nghiệp vụ của hệ thống được xây dựng trên nguyên lý tập trung dữ liệu (Centralized Data). Điều này có nghĩa là mọi phân hệ từ Quản lý khách hàng, Nhà cung cấp, Kho hàng đến Bán hàng và Tài chính đều truy xuất và cập nhật vào một cơ sở dữ liệu duy nhất.1 Khi một nghiệp vụ bán hàng phát sinh, hệ thống sẽ thực hiện một chuỗi các tác vụ tự động: giảm trừ tồn kho tại kho tương ứng, ghi nhận doanh thu vào báo cáo kết quả kinh doanh, cập nhật công nợ phải thu của khách hàng và đồng thời đẩy thông tin vào hệ thống quản trị điểm thưởng thành viên.6

Đặc thù của doanh nghiệp thương mại SME là sự linh hoạt và tốc độ. Do đó, hệ thống cần hỗ trợ đa kênh bán hàng, từ bán lẻ trực tiếp tại quầy (POS) sử dụng máy quét mã vạch cho đến bán buôn qua hợp đồng và bán hàng trực tuyến tích hợp đơn vị vận chuyển.2 Toàn bộ dòng đời của sản phẩm, từ khi nhập kho từ nhà cung cấp cho đến khi trao tận tay khách hàng và các dịch vụ hậu mãi sau bán hàng, đều phải được đặc tả rõ nét trong quy trình nghiệp vụ.

| Thành phần kiến trúc | Chức năng cốt lõi | Vai trò chiến lược |
| :---- | :---- | :---- |
| **Dữ liệu gốc (Master Data)** | Quản lý định danh Sản phẩm, Khách hàng, Nhà cung cấp | Đảm bảo tính nhất quán và chính xác của toàn hệ thống |
| **Quản lý Kho (WMS)** | Nhập, xuất, điều chuyển, kiểm kê, định mức tồn | Tối ưu hóa vốn lưu động và hiệu suất sử dụng hàng hóa |
| **Quản lý Bán hàng (Sales)** | Đơn hàng, báo giá, hóa đơn, trả hàng, khuyến mãi | Thúc đẩy doanh thu và trải nghiệm khách hàng |
| **Quản lý Tài chính (Finance)** | Thu, chi, công nợ, dòng tiền, lãi lỗ | Kiểm soát sức khỏe tài chính và rủi ro thanh khoản |
| **Báo cáo & Phân tích (BI)** | Dashboard kinh doanh, báo cáo quản trị, chỉ số KPI | Cung cấp căn cứ cho việc ra quyết định của lãnh đạo |

## **Chương II: Quản lý danh mục và dữ liệu gốc (Master Data Management)**

Dữ liệu gốc là nền tảng của toàn bộ hệ thống quản trị. Đối với một doanh nghiệp thương mại SME, việc chuẩn hóa danh mục sản phẩm, khách hàng và nhà cung cấp là điều kiện tiên quyết để hệ thống vận hành trơn tru và báo cáo chính xác.

### **2.1. Danh mục sản phẩm và quản lý hàng hóa đa chiều**

Sản phẩm trong doanh nghiệp thương mại không chỉ đơn thuần là mã hàng và tên hàng. Hệ thống cần hỗ trợ quản lý đa thuộc tính để đáp ứng các ngành hàng khác nhau như thời trang (màu sắc, kích cỡ), điện tử (Serial/IMEI), hay thực phẩm (số lô, hạn sử dụng).1

Một cấu trúc sản phẩm chuẩn cần bao gồm các thông tin từ cơ bản đến nâng cao:

* **Thông tin định danh:** Mã sản phẩm (SKU), Mã vạch (Barcode), Tên sản phẩm, Thương hiệu.  
* **Phân loại:** Nhóm sản phẩm (Category) theo cấu trúc cây đa tầng giúp dễ dàng lọc báo cáo theo ngành hàng.9  
* **Đơn vị tính:** Hỗ trợ đa đơn vị tính và quy đổi tự động. Ví dụ, một mặt hàng có thể nhập theo "Thùng" nhưng bán theo "Hộp" hoặc "Cái" với tỷ lệ quy đổi cố định.  
* **Thông tin kho:** Kho mặc định, vị trí kệ, và đặc biệt là định mức tồn kho tối thiểu/tối đa để phục vụ cảnh báo tự động.8  
* **Chính sách giá:** Giá nhập (giá vốn tạm tính), Giá bán lẻ, Giá bán buôn, Giá đại lý. Hệ thống cần cho phép thiết lập nhiều bảng giá khác nhau tùy theo đối tượng khách hàng.10

### **2.2. Danh mục khách hàng và chiến lược CRM tích hợp**

Khách hàng là tài sản lớn nhất của doanh nghiệp thương mại. Hệ thống không chỉ lưu trữ thông tin liên lạc mà còn phải theo dõi toàn bộ hành vi giao dịch và thói quen mua hàng.1

| Trường dữ liệu khách hàng | Ý nghĩa nghiệp vụ | Ứng dụng quản trị |
| :---- | :---- | :---- |
| **Mã/Tên khách hàng** | Định danh đối tượng giao dịch | Phân biệt khách lẻ và khách tổ chức 6 |
| **Mã số thuế** | Thông tin pháp lý để xuất hóa đơn | Tự động hóa lấy thông tin từ tổng cục thuế 6 |
| **Nhóm khách hàng** | Phân loại theo VIP, Đại lý, Khách mới | Áp dụng chính sách chiết khấu tự động 10 |
| **Hạn mức tín dụng** | Số nợ tối đa khách được phép nợ | Kiểm soát rủi ro công nợ phải thu 3 |
| **Thời hạn nợ** | Số ngày nợ tối đa cho mỗi hóa đơn | Tính toán tuổi nợ và nhắc nợ tự động 11 |
| **Nhân viên phụ trách** | Gắn khách hàng cho từng nhân viên sales | Tính hoa hồng và theo dõi hiệu quả đi tuyến 1 |

### **2.3. Danh mục nhà cung cấp và quản lý nguồn cung**

Quản lý nhà cung cấp giúp doanh nghiệp SME tối ưu hóa quy trình thu mua và duy trì mối quan hệ bền vững với các đối tác cung ứng. Thông tin nhà cung cấp cần bao gồm lịch sử nhập hàng, tỷ lệ hàng lỗi, và các điều khoản thanh toán (chiết khấu thanh toán sớm, thời gian công nợ).3 Hệ thống cần hỗ trợ tính năng tích chọn đối tượng vừa là khách hàng vừa là nhà cung cấp để thực hiện cấn trừ công nợ hai chiều khi cần thiết.6

## **Chương III: Nghiệp vụ quản lý kho và chuỗi cung ứng (Warehouse Management)**

Quản lý kho trong doanh nghiệp thương mại SME thường đối mặt với thách thức về sai lệch số liệu và thất thoát hàng hóa. Hệ thống nghiệp vụ kho phải được thiết kế để kiểm soát chặt chẽ mọi biến động hàng hóa.

### **3.1. Quy trình nhập kho thu mua**

Nghiệp vụ nhập kho bắt đầu từ nhu cầu bổ sung hàng tồn kho hoặc theo đơn đặt hàng của khách hàng. Quy trình này bao gồm các bước kiểm soát từ khi hàng rời nhà cung cấp đến khi nằm yên vị trong kho của doanh nghiệp.6

* **Lập lệnh nhập kho:** Căn cứ vào đơn đặt hàng đã ký với nhà cung cấp.  
* **Kiểm tra thực tế:** Thủ kho kiểm tra số lượng, chủng loại và tình trạng hàng hóa. Sử dụng máy quét mã vạch để đối chiếu với lệnh nhập kho nhằm loại bỏ sai sót.15  
* **Ghi nhận giá trị:** Kế toán kho cập nhật giá nhập thực tế, các chi phí liên quan (vận chuyển, bốc xếp) để tính toán giá vốn chính xác.6 Hệ thống cần hỗ trợ các phương pháp tính giá xuất kho phổ biến như Bình quân cuối kỳ, Bình quân tức thời, hay Nhập trước Xuất trước (FIFO).16  
* **Xác nhận nhập kho:** Sau khi xác nhận, tồn kho tăng lên và công nợ nhà cung cấp tự động phát sinh nếu là mua hàng chưa thanh toán.2

### **3.2. Nghiệp vụ xuất kho bán hàng và nội bộ**

Xuất kho bán hàng là nghiệp vụ diễn ra thường xuyên nhất. Hệ thống cần đảm bảo rằng hàng hóa được xuất đi theo đúng nguyên tắc và có đầy đủ chứng từ kèm theo.6

* **Xuất kho kiêm hóa đơn:** Đối với các giao dịch bán lẻ hoặc bán nhanh, phiếu xuất kho được hệ thống tự động sinh ra ngay khi hóa đơn bán hàng được lập.6  
* **Xuất kho theo lệnh giao hàng:** Đối với bán buôn, hàng hóa có thể được xuất thành nhiều đợt dựa trên một đơn hàng duy nhất. Hệ thống phải theo dõi được số lượng đã xuất và số lượng còn lại của từng đơn hàng.  
* **Điều chuyển kho:** Nghiệp vụ này phát sinh khi doanh nghiệp có nhiều kho hoặc chi nhánh. Quy trình yêu cầu sự xác nhận hai đầu: kho đi (xuất điều chuyển) và kho đến (nhập điều chuyển) để đảm bảo hàng hóa không bị thất thoát trong quá trình luân chuyển.15

### **3.3. Kiểm kê và tối ưu hóa hàng tồn kho**

Kiểm kê là hoạt động sống còn để đảm bảo tính trung thực của báo cáo tài chính. Hệ thống hỗ trợ kiểm kê định kỳ hoặc kiểm kê xoay vòng theo từng nhóm hàng.15

* **Cân đối kho tự động:** Sau khi kiểm kê, hệ thống tự động sinh ra các phiếu xuất điều chỉnh (nếu thiếu) hoặc nhập điều chỉnh (nếu thừa). Mọi chênh lệch đều phải được giải trình và gắn với trách nhiệm cá nhân.3  
* **Logic cảnh báo tồn kho tối thiểu:** Hệ thống tính toán dựa trên định mức đã khai báo và doanh số bán hàng trung bình để đưa ra cảnh báo khi hàng sắp hết.8 Điều này giúp doanh nghiệp tránh tình trạng "out of stock" làm mất cơ hội bán hàng.

Công thức tính số lượng cần nhập bổ sung (![][image1]) có thể dựa trên mô hình tồn kho tối thiểu:

![][image2]  
Trong đó:

* ![][image3]: Mức tồn kho tối đa thiết lập.  
* ![][image4]: Số lượng tồn kho thực tế hiện tại.  
* ![][image5]: Số lượng hàng đã được khách đặt nhưng chưa xuất kho.

## **Chương IV: Nghiệp vụ quản lý bán hàng và phân phối (Sales & Distribution)**

Phân hệ bán hàng là "mặt tiền" của hệ thống, nơi trực tiếp tạo ra dòng tiền và dữ liệu khách hàng. Sự linh hoạt trong nghiệp vụ bán hàng quyết định khả năng thích ứng của SME với thị trường.

### **4.1. Quy trình bán hàng đa mô hình**

Hệ thống cần cung cấp các giao diện và quy trình chuyên biệt cho từng loại hình bán hàng 2:

| Mô hình bán hàng | Đặc điểm nghiệp vụ | Yêu cầu hệ thống |
| :---- | :---- | :---- |
| **Bán lẻ tại quầy (POS)** | Giao dịch nhanh, thanh toán ngay, in hóa đơn nhỏ | Tích hợp máy quét, ngăn kéo đựng tiền, màn hình phụ cho khách |
| **Bán buôn (Wholesale)** | Theo dõi đơn hàng, báo giá, bán nợ, giao hàng sau | Quản lý báo giá, hợp đồng, phê duyệt hạn mức tín dụng 6 |
| **Bán hàng giao đi** | Tích hợp đơn vị vận chuyển, thu hộ (COD) | Theo dõi trạng thái đơn hàng (Đang giao, Đã giao, Hoàn hàng) 2 |
| **Bán hàng dịch vụ** | Không quản lý kho, tính phí theo lần hoặc theo giờ | Phân bổ doanh thu dịch vụ, quản lý kỹ thuật viên 6 |

### **4.2. Quản lý khuyến mãi và chính sách giá động**

Doanh nghiệp SME thường xuyên sử dụng khuyến mãi để kích cầu. Hệ thống nghiệp vụ phải hỗ trợ các kịch bản khuyến mãi phức tạp mà không cần can thiệp thủ công:

* **Chiết khấu thương mại:** Giảm giá trực tiếp trên dòng hàng hoặc tổng hóa đơn dựa trên giá trị đơn hàng hoặc số lượng mua.10  
* **Chương trình "Mua X tặng Y":** Tự động thêm sản phẩm tặng kèm vào giỏ hàng khi thỏa mãn điều kiện.  
* **Combo/Bundling:** Bán một nhóm sản phẩm với mức giá ưu đãi hơn so với mua lẻ từng món.  
* **Voucher và Mã giảm giá:** Quản lý phát hành, hạn dùng và điều kiện áp dụng mã giảm giá để theo dõi hiệu quả các chiến dịch Marketing.

### **4.3. Chương trình Loyalty và Tích điểm thành viên**

Để tăng tỷ lệ khách hàng quay lại, hệ thống tích hợp phân hệ quản lý thành viên (Loyalty).7

* **Quy tắc tích điểm:** Tự động cộng điểm dựa trên giá trị thanh toán thực tế (sau giảm giá).18  
* **Cơ chế tiêu điểm:** Khách hàng có thể dùng điểm để trừ vào hóa đơn mua hàng ở lần sau với tỷ lệ quy đổi xác định (Ví dụ: 1 điểm \= 1.000 VNĐ).18  
* **Phân hạng thành viên:** Tự động nâng/hạ hạng (Bạc, Vàng, Kim cương) dựa trên tổng chi tiêu hoặc số lần mua hàng trong một khoảng thời gian.7 Mỗi hạng thành viên sẽ có một bảng giá hoặc tỷ lệ chiết khấu mặc định riêng.20

### **4.4. Nghiệp vụ trả hàng và xử lý đổi trả (RMA)**

Xử lý trả hàng là một phần tất yếu của dịch vụ khách hàng. Hệ thống cần có quy trình chặt chẽ để tránh gian lận:

1. **Tiếp nhận yêu cầu:** Tìm kiếm hóa đơn gốc để xác định hàng hóa được mua khi nào, giá bao nhiêu.2  
2. **Kiểm tra điều kiện:** Hàng còn nguyên vẹn, trong thời hạn đổi trả.  
3. **Lập phiếu trả hàng:** Hệ thống tự động tính toán số tiền phải hoàn trả dựa trên đơn giá thực mua và các khuyến mãi đã áp dụng.  
4. **Xử lý tồn kho và tài chính:** Hàng được nhập lại kho (tăng tồn), tiền được trả lại khách (phiếu chi) hoặc cộng vào số dư nợ để trừ dần (cấn trừ công nợ).2

## **Chương V: Quản lý Tài chính, Quỹ và Công nợ (Finance & Accounting)**

Dòng tiền là mạch máu của doanh nghiệp SME. Việc tách bạch giữa doanh thu sổ sách và tiền mặt thực tế là nhiệm vụ quan trọng của phân hệ tài chính.

### **5.1. Quản lý Quỹ tiền mặt và Tiền gửi ngân hàng**

Hệ thống cần theo dõi biến động số dư tại nhiều quỹ tiền mặt và tài khoản ngân hàng khác nhau.5

* **Phiếu thu:** Ghi nhận tiền về từ bán hàng, thu nợ hoặc các khoản thu khác. Đối với thu tiền ngay tại quầy, hệ thống tự động sinh phiếu thu khi hoàn tất hóa đơn.6  
* **Phiếu chi:** Ghi nhận tiền ra để trả nhà cung cấp, chi lương, điện nước và các chi phí vận hành khác. Mọi phiếu chi đều cần có sự phê duyệt của người có thẩm quyền trên hệ thống.5  
* **Đối soát ngân hàng:** Tự động đối chiếu dữ liệu trên phần mềm với sổ phụ ngân hàng để phát hiện chênh lệch và đảm bảo tính chính xác của dòng tiền.5

### **5.2. Quản lý công nợ phải thu (Accounts Receivable)**

Quản lý nợ khách hàng không chỉ là ghi chép số tiền còn nợ mà còn là quản trị rủi ro.

* **Sổ chi tiết công nợ:** Theo dõi từng phát sinh nợ và thanh toán của mỗi khách hàng.11  
* **Báo cáo tuổi nợ (Aging Report):** Phân tích các khoản nợ theo thời gian quá hạn (0-30, 31-60, 61-90, \>90 ngày). Đây là cơ sở để bộ phận thu nợ ưu tiên xử lý các khoản nợ khó đòi.11  
* **Đối trừ chứng từ:** Một tính năng nâng cao cho phép kế toán khớp một khoản thanh toán với nhiều hóa đơn khác nhau hoặc ngược lại, giúp xác định chính xác hóa đơn nào đã được tất toán.11

### **5.3. Quản lý công nợ phải trả (Accounts Payable)**

Tương tự như nợ phải thu, nợ phải trả nhà cung cấp cần được quản lý để tối ưu hóa dòng tiền và duy trì uy tín.

* **Lịch thanh toán dự kiến:** Hệ thống nhắc nhở các khoản nợ sắp đến hạn để doanh nghiệp chủ động nguồn tiền, tránh bị phạt trả chậm hoặc làm gián đoạn nguồn cung.3  
* **Cấn trừ công nợ:** Cho phép bù trừ nợ phải thu và nợ phải trả đối với các đối tác vừa mua vừa bán.6

## **Chương VI: Quản lý Nhân sự, Hoa hồng và KPI (HR & Performance)**

Trong doanh nghiệp thương mại, con người là yếu tố then chốt thúc đẩy doanh số. Hệ thống cần cơ chế ghi nhận đóng góp của từng cá nhân một cách khách quan.

### **6.1. Nghiệp vụ tính hoa hồng bán hàng**

Hệ thống cần cung cấp công thức tính hoa hồng linh hoạt để tạo động lực cho nhân viên.12

* **Hoa hồng theo doanh thu:** Tính bằng tỷ lệ % trên số tiền thực thu của đơn hàng.  
* **Hoa hồng theo lợi nhuận:** Tính trên chênh lệch giữa giá bán và giá vốn (GP \- Gross Profit). Cách này giúp nhân viên hạn chế việc giảm giá quá đà cho khách hàng.  
* **Hoa hồng theo sản phẩm:** Một số sản phẩm cần đẩy hàng tồn hoặc sản phẩm mới có thể được thiết lập mức hoa hồng cao hơn.12  
* **Bảng hoa hồng đa tầng:** Hỗ trợ chia sẻ hoa hồng giữa nhân viên kinh doanh, quản lý nhóm và nhân viên hỗ trợ.12

### **6.2. Hệ thống chỉ số KPI kinh doanh**

Hệ thống tự động tổng hợp dữ liệu để đánh giá hiệu quả làm việc của đội ngũ sales 23:

* **Doanh số thực tế so với chỉ tiêu (Target):** Theo dõi tiến độ hoàn thành mục tiêu tháng/quý.25  
* **Số lượng khách hàng mới:** Đo lường khả năng mở rộng thị trường của nhân viên.24  
* **Tỷ lệ chốt đơn:** So sánh số lượng cơ hội/liên hệ mới với số đơn hàng thực tế đã ký kết.25  
* **Số tiền nợ quá hạn phát sinh:** Gắn trách nhiệm thu hồi nợ với nhân viên bán hàng để đảm bảo "doanh số an toàn".3

## **Chương VII: Hệ thống Báo cáo Quản trị và Phân tích (Business Intelligence)**

Hệ thống báo cáo là đích đến cuối cùng của dữ liệu, chuyển hóa các con số khô khan thành thông tin có giá trị hỗ trợ ra quyết định.

### **7.1. Báo cáo Tồn kho và Hiệu suất hàng hóa**

Báo cáo kho giúp chủ doanh nghiệp trả lời câu hỏi: "Tiền của tôi đang nằm ở đâu trong kho?".3

* **Báo cáo Nhập \- Xuất \- Tồn:** Cung cấp số dư đầu kỳ, biến động trong kỳ và số dư cuối kỳ của từng mặt hàng.3  
* **Báo cáo hàng tồn lâu ngày (Deadstock):** Liệt kê các sản phẩm có vòng quay tồn kho thấp, giúp doanh nghiệp sớm có kế hoạch xả hàng hoặc khuyến mãi để thu hồi vốn.27  
* **Phân tích ABC:** Phân loại hàng hóa theo giá trị đóng góp vào doanh thu. Nhóm A (hàng giá trị cao, bán chạy) cần được ưu tiên quản lý chặt chẽ hơn.

### **7.2. Báo cáo Bán hàng và Hiệu quả kinh doanh**

* **Báo cáo doanh số theo thời gian:** So sánh tăng trưởng giữa các tháng, các năm để nhận diện xu hướng thị trường.25  
* **Báo cáo lãi lỗ theo từng mặt hàng/nhóm hàng:** Xác định sản phẩm nào mang lại lợi nhuận thực tế cao nhất sau khi trừ đi các chi phí bán hàng trực tiếp.4  
* **Báo cáo hiệu quả kênh bán hàng:** So sánh doanh thu và chi phí giữa bán lẻ tại cửa hàng, bán trên sàn thương mại điện tử và bán qua đội ngũ trình dược viên/sales thị trường.

### **7.3. Báo cáo Tài chính và Dòng tiền nội bộ**

Đây là những báo cáo quan trọng nhất dành cho cấp lãnh đạo 3:

* **Báo cáo Kết quả Kinh doanh (P\&L):**  
  * Doanh thu thuần \= Doanh thu bán hàng \- Các khoản giảm trừ.4  
  * Lợi nhuận gộp \= Doanh thu thuần \- Giá vốn hàng bán.4  
  * Lợi nhuận ròng \= Lợi nhuận gộp \- Chi phí bán hàng \- Chi phí quản lý.4  
* **Báo cáo Lưu chuyển tiền tệ:** Chỉ rõ các nguồn thu và các khoản chi chính trong kỳ, giúp dự báo khả năng thiếu hụt tiền mặt trong tương lai.3

## **Chương VIII: Quản trị hệ thống, Phân quyền và Bảo mật (System Administration)**

Một hệ thống quản lý bán hàng mạnh mẽ phải đi kèm với cơ chế bảo mật và phân quyền chặt chẽ để bảo vệ tài sản thông tin của doanh nghiệp.

### **8.1. Cơ chế phân quyền dựa trên vai trò (Role-Based Access Control)**

Hệ thống cần cho phép định nghĩa các vai trò công việc chi tiết và gán quyền hạn tương ứng.31

| Vai trò người dùng | Quyền hạn tiêu biểu | Giới hạn an toàn |
| :---- | :---- | :---- |
| **Nhân viên bán hàng** | Lập đơn hàng, xem tồn kho, tra cứu giá bán | Không được xem giá vốn, không được sửa hóa đơn đã chốt |
| **Thủ kho** | Xác nhận nhập/xuất kho, thực hiện kiểm kê | Không xem được báo cáo tài chính và công nợ khách hàng |
| **Kế toán công nợ** | Thu tiền, đối trừ chứng từ, nhắc nợ | Không có quyền sửa đổi thông tin sản phẩm và giá bán |
| **Quản lý chi nhánh** | Xem báo cáo doanh số chi nhánh, phê duyệt giảm giá | Chỉ xem được dữ liệu trong phạm vi chi nhánh mình quản lý |
| **Giám đốc/Admin** | Toàn quyền truy cập tất cả các phân hệ và báo cáo | Cần cơ chế xác thực 2 lớp (2FA) cho các tác vụ nhạy cảm |

### **8.2. Bảo mật dữ liệu và Nhật ký hệ thống**

* **Nhật ký truy cập (Audit Log):** Hệ thống ghi lại chi tiết mọi thao tác: Ai, làm gì, khi nào, dữ liệu trước và sau khi sửa là gì. Điều này cực kỳ quan trọng để truy tìm nguyên nhân khi xảy ra sai lệch dữ liệu hoặc gian lận.31  
* **Sao lưu dữ liệu tự động:** Đối với các hệ thống Cloud, dữ liệu cần được sao lưu hàng ngày tại nhiều địa điểm khác nhau để đảm bảo khả năng phục hồi khi có sự cố thiên tai hoặc tấn công mạng.33  
* **Mã hóa thông tin:** Các thông tin nhạy cảm như mật khẩu người dùng, số dư tài khoản ngân hàng cần được mã hóa trong cơ sở dữ liệu.

## **Chương IX: Các nghiệp vụ mở rộng cho doanh nghiệp SME thương mại đặc thù**

Ngoài các nghiệp vụ cơ bản, tùy theo ngành hàng, hệ thống cần hỗ trợ các tính năng chuyên sâu để tối ưu hóa vận hành.

### **9.1. Quản lý theo Số lô và Hạn sử dụng (Batch & Expiry Date)**

Đối với ngành dược phẩm, thực phẩm hoặc hóa mỹ phẩm, đây là yêu cầu bắt buộc:

* **Xuất hàng theo FEFO (First Expired, First Out):** Ưu tiên xuất các lô hàng sắp hết hạn dùng trước để giảm thiểu lãng phí.  
* **Cảnh báo hàng sắp hết hạn:** Hệ thống tự động liệt kê các mặt hàng sẽ hết hạn trong vòng 3-6 tháng tới để doanh nghiệp có kế hoạch khuyến mãi đẩy hàng.5

### **9.2. Quản lý Serial Number và IMEI**

Dành cho ngành điện tử, điện máy:

* **Theo dõi từng đơn vị sản phẩm:** Mỗi máy điện thoại hoặc laptop có một mã Serial duy nhất. Hệ thống theo dõi mã này từ khi nhập kho đến khi bán cho khách hàng và trong suốt quá trình bảo hành.1  
* **Tra cứu bảo hành:** Khách hàng chỉ cần đọc số Serial để nhân viên kiểm tra thời hạn và lịch sử sửa chữa trên hệ thống.

### **9.3. Nghiệp vụ Ký gửi (Consignment)**

Nhiều SME thương mại thực hiện ký gửi hàng hóa tại các đại lý hoặc nhận ký gửi từ nhà cung cấp:

* **Ký gửi đầu vào:** Hàng nằm trong kho nhưng chưa thuộc sở hữu của doanh nghiệp. Doanh nghiệp chỉ thanh toán cho nhà cung cấp khi hàng đã bán được.  
* **Ký gửi đầu ra:** Hàng đã xuất khỏi kho nhưng vẫn thuộc sở hữu của doanh nghiệp. Hệ thống cần theo dõi tồn kho tại từng điểm ký gửi và đối soát định kỳ để ghi nhận doanh thu thực tế.

## **Chương X: Lộ trình triển khai và những lưu ý cho doanh nghiệp SME**

Triển khai một hệ thống quản lý bán hàng là một cuộc cách mạng về quy trình. Để thành công, doanh nghiệp cần lưu ý các điểm sau:

1. **Lựa chọn giải pháp phù hợp:** Không nhất thiết phải chọn phần mềm đắt nhất, mà phải chọn phần mềm đáp ứng tốt nhất các đặc thù nghiệp vụ của ngành hàng.15 Các giải pháp như MISA, KiotViet hay Sapo đều có những thế mạnh riêng cho từng phân khúc.1  
2. **Chuẩn hóa dữ liệu đầu vào:** "Rác vào thì rác ra". Nếu danh mục sản phẩm và tồn kho ban đầu không chính xác, mọi báo cáo sau này đều vô nghĩa. Doanh nghiệp cần dành thời gian thích đáng để làm sạch dữ liệu.17  
3. **Đào tạo và thay đổi tư duy:** Nhân viên là người trực tiếp vận hành hệ thống. Họ cần hiểu rằng việc nhập liệu đầy đủ không phải là gánh nặng mà là công cụ để họ làm việc hiệu quả hơn và nhận được hoa hồng chính xác hơn.12  
4. **Triển khai theo từng giai đoạn:** Thay vì áp dụng tất cả các phân hệ cùng lúc, SME nên bắt đầu với Kho và Bán hàng, sau đó mới đến Công nợ, Tài chính và cuối cùng là các báo cáo Quản trị nâng cao.

Việc áp dụng một tài liệu đặc tả nghiệp vụ chi tiết và khoa học là bước đi đầu tiên nhưng quan trọng nhất để xây dựng một nền tảng quản trị vững chắc, giúp doanh nghiệp SME không chỉ tồn tại mà còn phát triển mạnh mẽ trong thị trường đầy biến động. Hệ thống quản lý bán hàng không chỉ là một phần mềm, nó là hiện thân của tư duy quản trị chuyên nghiệp và hiện đại.

#### **Nguồn trích dẫn**

1. Phần mềm quản lý bán hàng cho doanh nghiệp và cửa hàng, truy cập vào tháng 4 22, 2026, [https://amis.misa.vn/52673/phan-mem-quan-ly-ban-hang/](https://amis.misa.vn/52673/phan-mem-quan-ly-ban-hang/)  
2. KiotViet \- Phần mềm quản lý bán hàng Phổ Biến Nhất, truy cập vào tháng 4 22, 2026, [https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-ban-hang/ban-hang/](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-ban-hang/ban-hang/)  
3. Những Báo Cáo Giám Đốc Cần Nắm Rõ Để Quản Lý Doanh Nghiệp Hiệu Quả, truy cập vào tháng 4 22, 2026, [https://ketoanleanh.edu.vn/kinh-nghiem-ke-toan/nhung-bao-cao-giam-doc-can-nam-ro-de-quan-ly-doanh-nghiep-hieu-qua.html](https://ketoanleanh.edu.vn/kinh-nghiem-ke-toan/nhung-bao-cao-giam-doc-can-nam-ro-de-quan-ly-doanh-nghiep-hieu-qua.html)  
4. 6 Mẫu báo cáo lãi lỗ nội bộ và hướng dẫn lập chuẩn cho SME Việt Nam \- CloudGO, truy cập vào tháng 4 22, 2026, [https://cloudgo.vn/mau-bao-cao-lai-lo-noi-bo](https://cloudgo.vn/mau-bao-cao-lai-lo-noi-bo)  
5. Misa là gì? Những chức năng chính trên phần mềm Misa\!, truy cập vào tháng 4 22, 2026, [https://tuyendung.kfcvietnam.com.vn/blog/phan-mem-misa](https://tuyendung.kfcvietnam.com.vn/blog/phan-mem-misa)  
6. Bán hàng hóa, dịch vụ trong nước – SME2023 \- MISA SME, truy cập vào tháng 4 22, 2026, [https://helpsme.misa.vn/2023/kb/banhanghoa\_dichvu\_trongnuoc/](https://helpsme.misa.vn/2023/kb/banhanghoa_dichvu_trongnuoc/)  
7. 7+ phần mềm quản lý bán hàng có tích điểm, đổi quà, ưu đãi khi mua hàng \- POS365, truy cập vào tháng 4 22, 2026, [https://www.pos365.vn/phan-mem-tich-diem-cho-khach-hang-7366.html](https://www.pos365.vn/phan-mem-tich-diem-cho-khach-hang-7366.html)  
8. Theo dõi số lượng tồn kho hàng hóa so với số lượng ... \- MISA SME, truy cập vào tháng 4 22, 2026, [https://helpsme.misa.vn/2023/kb/theo\_doi\_so\_luong\_ton\_kho\_hang\_hoa\_so\_voi\_so\_luong\_ton\_toi\_thieu/](https://helpsme.misa.vn/2023/kb/theo_doi_so_luong_ton_kho_hang_hoa_so_voi_so_luong_ton_toi_thieu/)  
9. Báo cáo kết quả kinh doanh là gì? Hướng dẫn đọc và phân tích \- Base.vn, truy cập vào tháng 4 22, 2026, [https://base.vn/blog/bao-cao-ket-qua-kinh-doanh/](https://base.vn/blog/bao-cao-ket-qua-kinh-doanh/)  
10. Áp dụng chiết khấu bán hàng nhiều lần: Theo mặt hàng và hóa đơn ..., truy cập vào tháng 4 22, 2026, [https://helpact.misa.vn/kb/ap-dung-chiet-khau-theo-mat-hang-va-hoa-don-tren-chung-tu-ban-hang/](https://helpact.misa.vn/kb/ap-dung-chiet-khau-theo-mat-hang-va-hoa-don-tren-chung-tu-ban-hang/)  
11. Làm thế nào để xem công nợ khách hàng chi tiết theo số ngày còn nợ và số ngày quá hạn theo từng hóa đơn? – SME2023, truy cập vào tháng 4 22, 2026, [https://helpsme.misa.vn/2023/kb/lam-the-nao-de-xem-cong-no-khach-hang-chi-tiet-theo-so-ngay-con-no-va-so-ngay-qua-han-theo-tung-hoa-don/](https://helpsme.misa.vn/2023/kb/lam-the-nao-de-xem-cong-no-khach-hang-chi-tiet-theo-so-ngay-con-no-va-so-ngay-qua-han-theo-tung-hoa-don/)  
12. Quản lý Hoa hồng \- KiotViet \- Phần mềm quản lý bán hàng Phổ Biến Nhất, truy cập vào tháng 4 22, 2026, [https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/salon-nhan-vien/quan-ly-hoa-hong/](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/salon-nhan-vien/quan-ly-hoa-hong/)  
13. Hướng dẫn báo cáo công nợ phải thu, phải trả khách hàng chi tiết \- Lạc Việt, truy cập vào tháng 4 22, 2026, [https://lacviet.vn/bao-cao-cong-no/](https://lacviet.vn/bao-cao-cong-no/)  
14. Tải mẫu phiếu xuất kho, nhập kho file Excel, Word mới nhất \- MISA meInvoice, truy cập vào tháng 4 22, 2026, [https://www.meinvoice.vn/tin-tuc/23785/mau-phieu-xuat-kho/](https://www.meinvoice.vn/tin-tuc/23785/mau-phieu-xuat-kho/)  
15. Phần mềm quản lý kho hàng toàn diện cho shop bán lẻ tốt nhất \- MISA eShop, truy cập vào tháng 4 22, 2026, [https://www.misaeshop.vn/7253/phan-mem-quan-ly-kho/](https://www.misaeshop.vn/7253/phan-mem-quan-ly-kho/)  
16. Hướng dẫn sử dụng phân hệ kho trên phần mềm Misa | KTHN, truy cập vào tháng 4 22, 2026, [https://daotaoketoanhn.edu.vn/phan-he-kho-tren-phan-mem-misa-4658/](https://daotaoketoanhn.edu.vn/phan-he-kho-tren-phan-mem-misa-4658/)  
17. Kiểm kê kho \- sme2017 \- MISA SME, truy cập vào tháng 4 22, 2026, [https://helpsme.misa.vn/2017/kiemkekho.htm](https://helpsme.misa.vn/2017/kiemkekho.htm)  
18. Top 11 phần mềm bán hàng có tính năng tích điểm cho khách hàng ..., truy cập vào tháng 4 22, 2026, [https://nhanh.vn/top-11-phan-mem-ban-hang-co-tinh-nang-tich-diem-cho-khach-hang-n94460.html](https://nhanh.vn/top-11-phan-mem-ban-hang-co-tinh-nang-tich-diem-cho-khach-hang-n94460.html)  
19. Tích điểm khách hàng – Tuyệt chiêu khuyến mãi các shop cần phải nhớ \- Sapo, truy cập vào tháng 4 22, 2026, [https://www.sapo.vn/blog/tich-diem-khach-hang-tuyet-chieu-khuyen-mai-cac-shop-can-phai-nho](https://www.sapo.vn/blog/tich-diem-khach-hang-tuyet-chieu-khuyen-mai-cac-shop-can-phai-nho)  
20. Tạo chiết khấu mặc định \- Hướng dẫn từ iPOS, truy cập vào tháng 4 22, 2026, [https://huongdan.ipos.vn/docs/huong-dan-su-dung-ipos-crm/thanh-vien/tao-chiet-khau-mac-dinh/](https://huongdan.ipos.vn/docs/huong-dan-su-dung-ipos-crm/thanh-vien/tao-chiet-khau-mac-dinh/)  
21. Quản lý Hoa hồng \- KiotViet \- Phần mềm quản lý bán hàng Phổ Biến Nhất, truy cập vào tháng 4 22, 2026, [https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-nhan-vien/quan-ly-hoa-hong/](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-nhan-vien/quan-ly-hoa-hong/)  
22. Quản lý Hoa hồng \- KiotViet \- Phần mềm quản lý bán hàng Phổ Biến Nhất, truy cập vào tháng 4 22, 2026, [https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/fnb-nhan-vien/quan-ly-hoa-hong/](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/fnb-nhan-vien/quan-ly-hoa-hong/)  
23. Tổng hợp mẫu KPI cho nhân viên bán hàng chuẩn chỉnh, mới nhất 2023, truy cập vào tháng 4 22, 2026, [https://job.vccorp.vn/bai-viet/mau-kpi-cho-nhan-vien-ban-hang.html](https://job.vccorp.vn/bai-viet/mau-kpi-cho-nhan-vien-ban-hang.html)  
24. Cách xây dựng chỉ số KPI cho nhân viên bán hàng hiệu quả \- Timviec365, truy cập vào tháng 4 22, 2026, [https://timviec365.vn/blog/chi-so-kpi-cho-nhan-vien-ban-hang-new8735.html](https://timviec365.vn/blog/chi-so-kpi-cho-nhan-vien-ban-hang-new8735.html)  
25. Mẫu KPI cho nhân viên kinh doanh \- Các chỉ số và chỉ tiêu quan trọng cần chú ý khi xây dựng \- TopCV, truy cập vào tháng 4 22, 2026, [https://www.topcv.vn/mau-kpi-cho-nhan-vien-kinh-doanh](https://www.topcv.vn/mau-kpi-cho-nhan-vien-kinh-doanh)  
26. 10 chỉ số quan trọng khi xây dựng mẫu KPI cho nhân viên kinh doanh \- Vieclam24h, truy cập vào tháng 4 22, 2026, [https://vieclam24h.vn/nghe-nghiep/tram-sac-ky-nang/kpi-cho-nhan-vien-kinh-doanh](https://vieclam24h.vn/nghe-nghiep/tram-sac-ky-nang/kpi-cho-nhan-vien-kinh-doanh)  
27. Inventory turnover là gì? Cách tính vòng quay hàng tồn kho \- SAPP Academy, truy cập vào tháng 4 22, 2026, [https://sapp.edu.vn/bai-viet-cfa/inventory-turnover-la-gi/](https://sapp.edu.vn/bai-viet-cfa/inventory-turnover-la-gi/)  
28. Vòng quay hàng tồn kho: cách tính và cách tối ưu hiệu quả \- FPT IS, truy cập vào tháng 4 22, 2026, [https://fpt-is.com/goc-nhin-so/vong-quay-hang-ton-kho/](https://fpt-is.com/goc-nhin-so/vong-quay-hang-ton-kho/)  
29. Báo cáo bán hàng theo mặt hàng và khách hàng \- AMIS Kế toán \- MISA, truy cập vào tháng 4 22, 2026, [https://helpact.misa.vn/kb/bao-cao-ban-hang-theo-mat-hang-va-khach-hang/](https://helpact.misa.vn/kb/bao-cao-ban-hang-theo-mat-hang-va-khach-hang/)  
30. Nắm vững 8 KPI trong báo cáo công nợ quá hạn theo khách hàng quản trị dòng tiền doanh nghiệp \- Taca Deeptech for Business \- Tacasoft, truy cập vào tháng 4 22, 2026, [https://tacasoft.vn/blog/bao-cao-cong-no-qua-han-theo-khach-hang](https://tacasoft.vn/blog/bao-cao-cong-no-qua-han-theo-khach-hang)  
31. Hướng dẫn thêm người dùng, vai trò và phân quyền sử dụng trên ..., truy cập vào tháng 4 22, 2026, [https://vietnamsofts.com/huong-dan-them-nguoi-dung-vai-tro-va-phan-quyen-su-dung-tren-phan-mem-ke-toan-misa-sme-net-2023-moi-nhat-2025/](https://vietnamsofts.com/huong-dan-them-nguoi-dung-vai-tro-va-phan-quyen-su-dung-tren-phan-mem-ke-toan-misa-sme-net-2023-moi-nhat-2025/)  
32. Phân quyền sử dụng – SME2023, truy cập vào tháng 4 22, 2026, [https://helpsme.misa.vn/2023/kb/phan\_quyen\_su\_dung/](https://helpsme.misa.vn/2023/kb/phan_quyen_su_dung/)  
33. Giới thiệu và so sánh giải pháp online trên phần mềm MISA SME.NET và phần mềm AMIS kế toán., truy cập vào tháng 4 22, 2026, [https://dichvudoanhnghiepssa.vn/blog/gioi-thieu-va-so-sanh-giai-phap-online-tren-phan-mem-misa-smenet-va-phan-mem-amis-ke-toan](https://dichvudoanhnghiepssa.vn/blog/gioi-thieu-va-so-sanh-giai-phap-online-tren-phan-mem-misa-smenet-va-phan-mem-amis-ke-toan)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADEAAAAYCAYAAABTPxXiAAACp0lEQVR4Xu2XWchNURTHl6mMGTNEKRkyvBjLkAchihdRhAfqQ0ihiDwoKUOUoQjlQXghiaIUnwh5kiiFUPKieFJK4f9r7c25+07n68p3Hu6/ft1zztpnnb3XWnu4Zk019d/UX8wXS8VY0anUXFx1ELPFU3FLrAzcFW/E1L9Ni6ku4qB4Z+WdxXZGfBUTE1thRCdPiS9iWmKLmmA+iJPmGSucNoif4beahogP4qUYkNjaXSPFJ/FCDExsWcVBANeF0l7xK/zW0jDx0Qo4iJ6iVfwQs0pNZcJOuweiV2JrV7WlRHZavozlFYG4LL5b/QDWVBxEvej2Fk/EZzE+sTUiNtF71uBCwcusNm/FoMSW1Srz1Wt7amhQS8QV0Tk1tEW8TEpZ/9kH2C/2me/OR8I9+wZ2Njvus2K/WCAuBNgI8blOnBYzzd/bGJ4jFgh8nxU3xLbwHI0Rh8RNMc/q+/ojPhw7uUIsC89Xi03ivTgquoXnUQxgh9htfq6ic7fFXLFIXDQPSIt4ZF6SBOS+GCxGmAcrzgeycj20o7R5d4ZV91UmjhmvzVef/ebnJRzykTnmHaaj2UxMF8/F0HDP/HpmHsHR4qGYLLqar4L8XhObQ3vmw2PzMo5lTbD4NpEnw+xblXxVFR2cYn5qXWyeRgYURUSwR7FaZeuZiNIRBsUH74i+wYYYJIOO57LsfKD9KzEq2LKq5Cu31opv5pP5uLhqpSVFLR8O12SKKFJeXK8X54ItikG0hl/acAbDxxrzAHByjss89knmA6zkK7cWmu8LwJxJD4bDzScgGTtm3qFYbsyv5eE6ig5R13vMM3xJnBdbRUexRRwwL6cT5hlAlXzlVg+xyzwL4xJbFBHrZ+WrVner/icKv7E91/iIot77ZO5RLV9NNfUv9Rs0r3x+AYhCugAAAABJRU5ErkJggg==>

[image2]: <data:image/png;base64,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>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAYCAYAAACIhL/AAAACSUlEQVR4Xu2WzYuOURjGLw0a+R4jyVdJCiMLSiQpJQtsKAo1RZGM8pXIQoN8ZCESC4WFz7CRGSIJC7GysFFqpvwDFpY+flf3Oc07Z96VqeddzFz16z3vfZ/nOfe5zzn3eaRhDWGNgzWwDiYm2xSYmjs0SqPgJHyHA7APPsMleAcL+rpWr5FwHR7A2Bq7M/cJ3ioy2zCtgF5oKx3oBFwpjVXrLPyAmaUDHYVNpbFq3YG/cByaCt88aClslWubIkDzG97ALphQ26mR8gk+pwguB2q+qP6yN0xeXpeTC/BTEeSefj0qlgPyHhtROtB6+APHSkeVmgtXFXWw1FL4BdtLR5Vy+XgGzaUD7YBvMCv93wiPYBHshm5oh/lwEx6mdpZXZzM8hZ2wUn2JcN29p6ixW+FJsg2Q65+ztLywe9l9QDyANUNxqv3Cl4qyM11xLR5WbJF2RaCWA7kG+5PPzz1O9iWwQTEB31wH4b7qXAa+uhz5Efia2g7iMvQoZpb3pgOarch2LtreAq9gcvrvyeb96mz4ipyW/nvwQ6k9B8ZAK3xQvGeS6qyiOzlTlsvMMtii+JIZ0FmRxfeKfWt5b95STMJfPQ42L5MDvZt8TkQXrEq+rHKCg5YH8EAe0AM7uFyC7HNxX6hYBQeYs+n7/aMieF8IHdCpeDZPYi2sTv3/W16iU6ntjL1QZMHy4D40pxVLuFix5/bCDXgNFxU19gych9vwXBGog/YqDkqj1f8l5TbwZ1qt34dgfGrb7uctZ8x2/9pe+3k3rKGjf8qyXIr36fcDAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAAAYCAYAAACr3+4VAAAC1ElEQVR4Xu2XSaiOURjH/zJknodkigyJkCEZFjcZCwsUxQpRFsqUSFKSISRDZCMLkYyZkuKGIlYWJKUoG0sLS8P/1/O9fe93vPcusLjv7fvXr76ec77znOF5znleqa66Wp26mgYz3/So2PqYflmHsqu92WM+ms1mk3ltjpqnZmy1a3nVzpw1V0yXnJ2TfGUaFSddes0wn834tMHabU6mxrLqgPliBqcN1g6zNDWWVRfNL7PLtE3aRpreia20WqVYKPwwj8060z3fqTWIG/egYpHZguGNisO59CJseUYOm2+KxW6s6dFy1UFxYIViYeRgm7TBWmh+mp1pQwsUz+NlsyRtyDTCnFJ0TDXFfDer04YWqAHmhZopang27piOaYO1xnwwQ3K2vmavuWs2KMJlgblvJlX6kNNrFZvHDl81s8whs990asaOxpgjCh/zFOPg65wZpXjXHyhKVMSledN8NRfMhIq9RryfnNr0xE44cxEtz9mGmXsKZw3mrZltViic76v0I6cpMAYpJkEbi2JDKC/xVWRn/GXmtqLG7qbYgJlmsbmkqN7YEKLtlqrVWuazUHS6brYrJs1vJnDCfDIrVc3dLAeyfCUCepr+ZqjiRFk0/ZkQE+btpY2IIXK4KFhAU3aihXkcV6QLJ8g9gY/R5rligSgficztmsJnodgZTg7hbKridBr0ZygPNO8Ui0mF80eml2KyT1TNFU71meIuyKvIzjjvFRGTKu+DzTyt6muQ+vwnkewvVVsLj1NEBfnGKTKBaYpig3BbZOYq8in/oYCK7EyUDwg2FTHeZMWJccLkH7Zsk5jLNjPHPFSEOvfKcP78t8LBFkVYUUUdUywEe5a7680ZxSTILS6lrarmbl5Fdsbi85DLiYXxGmShel7hFzHuDcWlOFGx4Y2K8pVQ/y/KcjNVlmeIPlnoN/WIN2VHREnqo7Nqa3D+yxiZ8j7rqqs16DcgyHpH9EsctAAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAAAYCAYAAABOQSt5AAADfElEQVR4Xu2YWahNURjHPxki80xIhDJEQoY8CBkKmQrhQYoMKVOGpJCkiIwlJcmQTGV+4eKBeBBFEkV5kScPvBn+v7697t53ncNxrvu07/nXr7P32muvvfY3rbWPWUUVVVSmWohxYpJonbS1Fx1Dh7yrsdgm3os1YqV4JvaJh6J/2jW/aiSOiwuieaadSHgqqswjJfcaLT6KQfEFaas4FDfmVbvFJ9E9viBtFDPixrzqtPgltoiG0bU+ol3UllvNNzcE/BD3xFLRKtupPogVY4+5EYJB4IUVT5fci7RgmdwrvpobY3mNHsU1RLwVj0RLMUV8EWdFg0y/ulITc+eVoxXiu3k9LBAvTg0oNlle5qfYFF/4gzBYdnXh+F+MWK5Y6s+L6fGFEmoqroqJ8QXUWxw2HzzWMPFNLIwvFBH3X7K0b1vxQIyt7lF36iweW/kbPFL8ifk7F4hl8bq5tWItMg/3Hpk2BttvbrzJolvS3kHct3Ry/HJOexDH28UNsV40S9oJcYo13mLsLkn7AHFK7BDjzVcuCjj9PifXBid9GYsxcAZjhE8D2onKK+Y75NtWc8NYLfIFr4+M2kkXCuWcTNtQcy8zUQzyxlKP88s1IgERGUwqRFpPcVP0Tc7ZpK02N8JRscDcUM/FVHMHXTbfzY4wf1bwZJyCvDTGCXOdaT4G7TyTFA8RW7Q+8BAetkG8So6x+EHxQcyztHaEvGTyCI8TnoQpiieXrQ/h3myt4Zi9C14kcpgL9YotPZ7n24YXQOR08GR4odnJNcRz3onF5uOGiOBdbplHBRFP5GOgAtEBzyM8M1zMNf/yjFOlq3hp7h2Exy6aT6xUfeDe15nz0D8YI/YStYlnhWWbfqFPnIKIMVjl4oJPO5GH/lofyhEvU5X88sAjYp1YYmk9GGPuhXBOus0yjxqW1ZAWA80NRbqcFKuSdkTaTRPXzKMEZ+FVDM/XMNFx13yJpob1Mo++bLQxBmNjiLCyEF1E1QRzR9daeHGX+Wc61ucrlWK1VrQxL0Y7xSjzSTB5ihwewHD0OyGWiXOin7mIQvKbFOFlNpv/70Ff7jlgXlyPJX0wYpX5p0BIHZ7HfIjIMAYGpJifMf9LgfvvmG8aO/lt/yfyNGxkOA7hSFu2GpNacXpxjtFihdoQf+Pgddp4Rqmx6UfaxJus7LxqswmrqKL6qt+pWJuZDtTkrAAAAABJRU5ErkJggg==>